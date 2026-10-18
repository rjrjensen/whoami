// D1 access: saved reports, Ryan's skill answers (the registry), and the queue of skills he hasn't confirmed.
import { skillKey, type FitReport, type ReportItem, type SkillAnswer } from "./report";

const CACHE_DAYS = 7;
export const RETENTION_MONTHS = 12;

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

export type SavedCheck = {
  report: FitReport;
  jdHash: string;
  jdText: string;
  ipHash: string;
  extractor: string | null;
  usage: { input: number; output: number } | null;
};

export async function saveCheck(db: D1Database, c: SavedCheck) {
  const stmts = [
    db
      .prepare(
        `INSERT INTO fit_checks (id, created_at, jd_hash, jd_text, role_title, company, score, report_json, extractor, matcher, input_tokens, output_tokens, cached, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        c.report.id,
        // SQLite's datetime() format, so comparisons against datetime('now', ...) work.
        c.report.createdAt.replace("T", " ").slice(0, 19),
        c.jdHash,
        c.report.cached ? null : c.jdText,
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
export const purgeOldJobDescriptions = (db: D1Database) =>
  db.prepare(`UPDATE fit_checks SET jd_text = NULL WHERE jd_text IS NOT NULL AND created_at < datetime('now', ?)`).bind(`-${RETENTION_MONTHS} months`).run();
