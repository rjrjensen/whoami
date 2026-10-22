// D1 access: saved reports, Ryan's skill answers (the registry), and the queue of skills he hasn't confirmed.
import { skillKey, type FitReport, type ReportItem, type SkillAnswer } from "./report";

const CACHE_DAYS = 7;

export async function cachedReport(db: D1Database, jdHash: string): Promise<FitReport | null> {
  const row = await db
    .prepare(`SELECT report_json FROM fit_checks WHERE jd_hash = ? AND cached = 0 AND created_at > datetime('now', ?) ORDER BY created_at DESC LIMIT 1`)
    .bind(jdHash, `-${CACHE_DAYS} days`)
    .first<{ report_json: string }>();
  return row ? (JSON.parse(row.report_json) as FitReport) : null;
}

/** A saved report by id, so a report's link keeps working. Returns the report only, never the job description. */
export async function getReport(db: D1Database, id: string): Promise<FitReport | null> {
  const row = await db.prepare(`SELECT report_json FROM fit_checks WHERE id = ?`).bind(id).first<{ report_json: string }>();
  return row ? (JSON.parse(row.report_json) as FitReport) : null;
}

/** Fresh (uncached) checks since the first of this month, for the spend cap. */
export async function checksThisMonth(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM fit_checks WHERE cached = 0 AND created_at >= datetime('now', 'start of month')`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function skillAnswers(db: D1Database, skills: string[]): Promise<Map<string, SkillAnswer>> {
  const keys = [...new Set(skills.map(skillKey))];
  if (!keys.length) return new Map();
  const { results } = await db
    .prepare(`SELECT skill_key, status, evidence_id, note FROM skill_answers WHERE skill_key IN (${keys.map(() => "?").join(",")})`)
    .bind(...keys)
    .all<{ skill_key: string; status: SkillAnswer["status"]; evidence_id: string | null; note: string | null }>();
  return new Map(results.map((r) => [r.skill_key, { status: r.status, evidenceId: r.evidence_id, note: r.note }]));
}

/** Who pasted it: a site visitor, or Ryan through the admin app's "Add posting" box. */
export type Source = "visitor" | "ryan";

export type SavedCheck = {
  report: FitReport;
  jdHash: string;
  /** Exactly what the visitor pasted, before normalizing. */
  jdText: string;
  ipHash: string;
  extractor: string | null;
  usage: { input: number; output: number } | null;
  source: Source;
};

export async function saveCheck(db: D1Database, c: SavedCheck) {
  const stmts = [
    db
      .prepare(
        `INSERT INTO fit_checks (id, created_at, jd_hash, jd_text, role_title, company, score, report_json, extractor, matcher, input_tokens, output_tokens, cached, ip_hash, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        c.report.id,
        // SQLite's datetime() format, so comparisons against datetime('now', ...) work.
        c.report.createdAt.replace("T", " ").slice(0, 19),
        c.jdHash,
        c.jdText,
        c.report.role.title,
        c.report.role.company,
        c.report.score,
        JSON.stringify(c.report),
        c.extractor,
        c.report.matcher,
        c.usage?.input ?? null,
        c.usage?.output ?? null,
        c.report.cached ? 1 : 0,
        c.ipHash,
        c.source,
      ),
  ];
  if (!c.report.cached) stmts.push(...c.report.items.filter((i) => i.status === "unconfirmed").map((i) => queueQuestion(db, i, c.report.id)));
  await db.batch(stmts);
}

// One row per skill: repeat asks bump the count, and a must-have anywhere makes the question a must-have.
const queueQuestion = (db: D1Database, item: ReportItem, fitCheckId: string) =>
  db
    .prepare(
      `INSERT INTO skill_questions (skill_key, skill, example, importance, last_fit_check_id) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (skill_key) DO UPDATE SET
         times_asked = times_asked + 1,
         last_asked_at = datetime('now'),
         last_fit_check_id = excluded.last_fit_check_id,
         importance = CASE WHEN excluded.importance = 'must' THEN 'must' ELSE importance END`,
    )
    .bind(skillKey(item.skill), item.skill, item.requirement, item.importance, fitCheckId);

/** Daily: drop pasted job descriptions past the retention window. Reports and hashes stay. */

/** Distinct postings checked so far (repeats of the same posting count once). */
export async function distinctPostings(db: D1Database): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(DISTINCT jd_hash) AS n FROM fit_checks`).first<{ n: number }>();
  return row?.n ?? 0;
}

/** Records a milestone; true only the first time, so its alert goes out once. */
export async function reachMilestone(db: D1Database, name: string): Promise<boolean> {
  const { meta } = await db.prepare(`INSERT INTO milestones (name) VALUES (?) ON CONFLICT (name) DO NOTHING`).bind(name).run();
  return meta.changes > 0;
}

/** Notes that Claude just refused for lack of credit, so a visitor's nudge can be trusted (see claimNudge). */
export async function noteOutOfCredits(db: D1Database): Promise<void> {
  await db.prepare(`INSERT INTO alert_times (name, at) VALUES ('out_of_credits', datetime('now')) ON CONFLICT (name) DO UPDATE SET at = excluded.at`).run();
}

/**
 * Claims the "out of credits" push for a visitor's nudge: true at most once an hour however many visitors click, and
 * only within an hour of a real credit error, so a stray POST can't send a false alarm. One statement, so two clicks
 * at the same moment can't both win.
 */
export async function claimNudge(db: D1Database): Promise<boolean> {
  const { meta } = await db
    .prepare(
      `INSERT INTO alert_times (name, at)
       SELECT 'nudge', datetime('now') WHERE EXISTS (SELECT 1 FROM alert_times WHERE name = 'out_of_credits' AND at > datetime('now', '-1 hour'))
       ON CONFLICT (name) DO UPDATE SET at = excluded.at WHERE alert_times.at <= datetime('now', '-1 hour')`,
    )
    .run();
  return meta.changes > 0;
}

export type DaySummary = {
  checks: number;
  best: { id: string; score: number; role_title: string | null; company: string | null } | null;
  questions: { skill: string; importance: "must" | "nice"; times_asked: number }[];
};

/** The last 24 hours: checks run, the best match, and skills asked about that Ryan hasn't answered. */
export async function lastDay(db: D1Database): Promise<DaySummary> {
  const [checks, best, questions] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM fit_checks WHERE cached = 0 AND created_at > datetime('now', '-1 day')`),
    db.prepare(`SELECT id, score, role_title, company FROM fit_checks WHERE created_at > datetime('now', '-1 day') ORDER BY score DESC LIMIT 1`),
    db.prepare(
      `SELECT skill, importance, times_asked FROM skill_questions WHERE status = 'open' AND last_asked_at > datetime('now', '-1 day')
       ORDER BY importance = 'must' DESC, times_asked DESC`,
    ),
  ]);
  return {
    checks: (checks.results[0] as { n: number }).n,
    best: (best.results[0] as DaySummary["best"]) ?? null,
    questions: questions.results as DaySummary["questions"],
  };
}
