// Skill questions: the queue the Worker fills (skill_questions) and Ryan's answers to it.
// The full answer goes to skill_responses; the part the v1 Worker understands also goes to skill_answers, so reports recompute.
import { RECORD } from "@ryanjensen/fit-check/record";

export const ANSWERS = ["have", "close", "learning", "dont_have", "not_pursuing"] as const;
export type Answer = (typeof ANSWERS)[number];

export const ANSWER_LABELS: Record<Answer, string> = {
  have: "I have this",
  close: "Something close I haven't listed",
  learning: "I'm learning it",
  dont_have: "I don't have it",
  not_pursuing: "Not for me",
};

/** The v1 Worker's registry statuses (skill_answers.status). "close" and "dont_have" have none yet. */
const REGISTRY: Partial<Record<Answer, "have" | "learning" | "not_pursuing">> = { have: "have", learning: "learning", not_pursuing: "not_pursuing" };

export type EvidenceKind = "job" | "project" | "education" | "certificate" | "testimonial" | "self_taught";
export const EVIDENCE_KINDS = ["job", "project", "education", "certificate"] as const;
export const EVIDENCE = RECORD.evidence.filter((e) => (EVIDENCE_KINDS as readonly string[]).includes(e.kind));
const evidenceById = new Map(EVIDENCE.map((e) => [e.id, e]));

export const MAX_NOTE = 500;
export const MAX_CLOSE = 120;

export type Question = {
  skill_key: string;
  skill: string;
  example: string;
  importance: "must" | "nice";
  times_asked: number;
  last_asked_at: string;
  last_fit_check_id: string | null;
};

export type SkillResponse = {
  skill_key: string;
  skill: string;
  answer: Answer;
  evidence_kind: EvidenceKind | null;
  evidence_id: string | null;
  close_to: string | null;
  note: string | null;
  resume_status: "todo" | "not_needed" | "done";
  /** The resume.yaml pull request this answer is in (resume-pr.ts). */
  resume_pr: number | null;
  answered_at: string;
};

/** Open questions: must-haves first, then the most asked, then the most recent. */
export async function openQuestions(db: D1Database): Promise<Question[]> {
  const { results } = await db
    .prepare(
      `SELECT skill_key, skill, example, importance, times_asked, last_asked_at, last_fit_check_id FROM skill_questions
       WHERE status = 'open' ORDER BY importance = 'must' DESC, times_asked DESC, last_asked_at DESC`,
    )
    .all<Question>();
  return results;
}

export async function answered(db: D1Database): Promise<SkillResponse[]> {
  const { results } = await db.prepare(`SELECT * FROM skill_responses ORDER BY answered_at DESC, skill`).all<SkillResponse>();
  return results;
}

export type AnswerInput = {
  skillKey: string;
  answer: Answer;
  evidenceKind: EvidenceKind | null;
  evidenceId: string | null;
  closeTo: string | null;
  note: string | null;
};

export type AnswerErrors = Partial<Record<"answer" | "evidence" | "closeTo" | "note" | "form", string>>;

const text = (form: FormData, name: string, max: number) => {
  const v = String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  return v || null;
};

/**
 * Reads and checks one answer form. The evidence <select> sends a record id, "testimonial", "self_taught", or "".
 */
export function parseAnswer(form: FormData): { ok: true; value: AnswerInput } | { ok: false; errors: AnswerErrors } {
  const errors: AnswerErrors = {};
  const skillKey = String(form.get("skill_key") ?? "");
  const answer = String(form.get("answer") ?? "") as Answer;
  const note = text(form, "note", MAX_NOTE);
  const evidence = answer === "have" ? String(form.get("evidence") ?? "") : "";
  const closeTo = answer === "close" ? text(form, "close_to", MAX_CLOSE) : null;

  if (!skillKey) errors.form = "That question is missing. Reload and try again.";
  if (!ANSWERS.includes(answer)) errors.answer = "Pick one of the five answers.";

  let evidenceKind: EvidenceKind | null = null;
  let evidenceId: string | null = null;
  if (evidence === "testimonial" || evidence === "self_taught") evidenceKind = evidence;
  else if (evidence) {
    const item = evidenceById.get(evidence);
    if (item) [evidenceKind, evidenceId] = [item.kind as EvidenceKind, item.id];
    else errors.evidence = "That evidence isn't in the record. Pick another.";
  }
  if (evidenceKind === "self_taught" && !note) errors.note = "Self-taught needs a note saying how you learned it.";
  if (evidenceKind === "testimonial" && !note) errors.note = "Say which testimonial in the note.";
  if (answer === "close" && !closeTo) errors.closeTo = "Name the skill or experience you have instead.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { skillKey, answer, evidenceKind, evidenceId, closeTo, note } };
}

/** Saves an answer in one batch: the full response, the Worker's registry row, and closes the question. */
export async function saveAnswer(db: D1Database, a: AnswerInput): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT skill FROM skill_questions WHERE skill_key = ?1
       UNION ALL SELECT skill FROM skill_responses WHERE skill_key = ?1 LIMIT 1`,
    )
    .bind(a.skillKey)
    .first<{ skill: string }>();
  if (!row) return false;

  const status = REGISTRY[a.answer];
  await db.batch([
    db
      .prepare(
        `INSERT INTO skill_responses (skill_key, skill, answer, evidence_kind, evidence_id, close_to, note, resume_status, answered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT (skill_key) DO UPDATE SET
           skill = excluded.skill, answer = excluded.answer, evidence_kind = excluded.evidence_kind, evidence_id = excluded.evidence_id,
           close_to = excluded.close_to, note = excluded.note, resume_status = excluded.resume_status, answered_at = excluded.answered_at`,
      )
      .bind(a.skillKey, row.skill, a.answer, a.evidenceKind, a.evidenceId, a.closeTo, a.note, a.answer === "have" || a.answer === "close" ? "todo" : "not_needed"),
    status
      ? db
          .prepare(
            `INSERT INTO skill_answers (skill_key, skill, status, evidence_id, note, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT (skill_key) DO UPDATE SET
               skill = excluded.skill, status = excluded.status, evidence_id = excluded.evidence_id, note = excluded.note, updated_at = excluded.updated_at`,
          )
          .bind(a.skillKey, row.skill, status, status === "have" ? a.evidenceId : null, a.note)
      : db.prepare(`DELETE FROM skill_answers WHERE skill_key = ?`).bind(a.skillKey),
    db.prepare(`UPDATE skill_questions SET status = 'answered' WHERE skill_key = ?`).bind(a.skillKey),
  ]);
  return true;
}
