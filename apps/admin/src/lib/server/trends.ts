// Loads every saved check for the trends page and works out Ryan's status for each skill.
import { RECORD } from "@ryanjensen/fit-check/record";
import type { Status } from "@ryanjensen/fit-check/report";
import { resolveSkills } from "#lib/server/skills.ts";
import { computeTrends, pickStatus, type Filters, type SkillStatus, type Source, type TrendReport, type TrendRow } from "#lib/trends.ts";

export async function loadTrends(db: D1Database, filters: Filters) {
  const [checks, responses, answers] = await db.batch([
    db.prepare(`SELECT jd_hash, created_at, report_json, source FROM fit_checks ORDER BY created_at`),
    db.prepare(`SELECT skill, answer FROM skill_responses`),
    db.prepare(`SELECT skill, status FROM skill_answers`),
  ]);
  const rows: TrendRow[] = (checks.results as { jd_hash: string; created_at: string; report_json: string; source: Source }[]).map((r) => ({
    jd_hash: r.jd_hash,
    created_at: r.created_at,
    source: r.source,
    report: JSON.parse(r.report_json) as TrendReport,
  }));
  const responseRows = responses.results as { skill: string; answer: string }[];
  const answerRows = answers.results as { skill: string; status: string }[];

  const raw = [...rows.flatMap((r) => r.report.items.map((i) => i.skill)), ...responseRows.map((r) => r.skill), ...answerRows.map((r) => r.skill)];
  const skillOf = await resolveSkills(db, raw);

  const byId = <T>(list: { skill: string; value: T }[]) => {
    const out = new Map<number, T>();
    for (const { skill, value } of list) {
      const ref = skillOf.get(skill);
      if (ref) out.set(ref.id, value);
    }
    return out;
  };
  const response = byId(responseRows.map((r) => ({ skill: r.skill, value: r.answer })));
  const answer = byId(answerRows.map((r) => ({ skill: r.skill, value: r.status })));
  // Rows are oldest first, so the last item seen for a skill is the latest.
  const latest = byId<Status>(rows.flatMap((r) => r.report.items.map((i) => ({ skill: i.skill, value: i.status }))));
  const onResume = new Set(RECORD.skills.map((s) => s.name.toLowerCase()));

  const statusOf = new Map<number, SkillStatus>();
  for (const ref of skillOf.values())
    if (!statusOf.has(ref.id))
      statusOf.set(ref.id, pickStatus({ response: response.get(ref.id), answer: answer.get(ref.id), onResume: onResume.has(ref.name.toLowerCase()), latest: latest.get(ref.id) }));

  return computeTrends(rows, skillOf, statusOf, filters);
}
