import { describe, expect, it } from "vitest";
import { testDb } from "../../test/d1";
import { answered, openQuestions, parseAnswer, saveAnswer, type AnswerInput } from "./questions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

async function seeded() {
  const db = testDb();
  await db.batch([
    db.prepare(`INSERT INTO skill_questions (skill_key, skill, example, importance, times_asked, last_asked_at) VALUES ('rust', 'Rust', 'Rust in production', 'nice', 5, '2026-10-10 00:00:00')`),
    db.prepare(`INSERT INTO skill_questions (skill_key, skill, example, importance, times_asked, last_asked_at) VALUES ('kafka', 'Kafka', 'Event streaming with Kafka', 'must', 1, '2026-10-01 00:00:00')`),
    db.prepare(`INSERT INTO skill_questions (skill_key, skill, example, importance, times_asked, last_asked_at) VALUES ('elixir', 'Elixir', 'Elixir services', 'must', 3, '2026-10-02 00:00:00')`),
    db.prepare(`INSERT INTO skill_questions (skill_key, skill, example, importance, times_asked, last_asked_at) VALUES ('go', 'Go', 'Go microservices', 'must', 3, '2026-10-05 00:00:00')`),
  ]);
  return db;
}

const input = (over: Partial<AnswerInput>): AnswerInput => ({ skillKey: "kafka", answer: "have", evidenceKind: null, evidenceId: null, closeTo: null, note: null, ...over });
const registry = (db: D1Database, key: string) => db.prepare(`SELECT status, evidence_id, note FROM skill_answers WHERE skill_key = ?`).bind(key).first();

describe("openQuestions", () => {
  it("puts must-haves first, then the most asked, then the most recent", async () => {
    expect((await openQuestions(await seeded())).map((q) => q.skill)).toEqual(["Go", "Elixir", "Kafka", "Rust"]);
  });
});

describe("parseAnswer", () => {
  it("accepts a record id as evidence and derives its kind", () => {
    const r = parseAnswer(form({ skill_key: "kafka", answer: "have", evidence: "job-ups" }));
    expect(r).toMatchObject({ ok: true, value: { evidenceKind: "job", evidenceId: "job-ups" } });
  });

  it("rejects unknown answers and evidence", () => {
    expect(parseAnswer(form({ skill_key: "kafka", answer: "maybe" }))).toMatchObject({ ok: false, errors: { answer: expect.any(String) } });
    expect(parseAnswer(form({ skill_key: "kafka", answer: "have", evidence: "job-made-up" }))).toMatchObject({ ok: false, errors: { evidence: expect.any(String) } });
  });

  it("needs a note for self-taught and a name for something close", () => {
    expect(parseAnswer(form({ skill_key: "kafka", answer: "have", evidence: "self_taught" }))).toMatchObject({ ok: false, errors: { note: expect.any(String) } });
    expect(parseAnswer(form({ skill_key: "kafka", answer: "close", close_to: "  " }))).toMatchObject({ ok: false, errors: { closeTo: expect.any(String) } });
  });

  it("ignores evidence unless the answer is have, and caps text", () => {
    const r = parseAnswer(form({ skill_key: "kafka", answer: "learning", evidence: "job-ups", note: "x".repeat(900) }));
    expect(r.ok && r.value.evidenceId).toBe(null);
    expect(r.ok && r.value.note?.length).toBe(500);
  });
});

describe("saveAnswer", () => {
  it("writes the registry row the Worker reads and closes the question", async () => {
    const db = await seeded();
    expect(await saveAnswer(db, input({ evidenceKind: "job", evidenceId: "job-ups", note: "Ran it at a past job." }))).toBe(true);
    expect(await registry(db, "kafka")).toEqual({ status: "have", evidence_id: "job-ups", note: "Ran it at a past job." });
    expect(await db.prepare(`SELECT status FROM skill_questions WHERE skill_key = 'kafka'`).first("status")).toBe("answered");
    expect((await openQuestions(db)).map((q) => q.skill)).not.toContain("Kafka");
    expect((await answered(db))[0]).toMatchObject({ skill: "Kafka", answer: "have", resume_status: "todo" });
  });

  it("maps learning and not-for-me to the Worker's statuses", async () => {
    const db = await seeded();
    await saveAnswer(db, input({ skillKey: "rust", answer: "learning" }));
    await saveAnswer(db, input({ skillKey: "go", answer: "not_pursuing", note: "Not a focus." }));
    expect(await registry(db, "rust")).toEqual({ status: "learning", evidence_id: null, note: null });
    expect(await registry(db, "go")).toEqual({ status: "not_pursuing", evidence_id: null, note: "Not a focus." });
    expect((await answered(db)).find((r) => r.skill_key === "rust")?.resume_status).toBe("not_needed");
  });

  it("keeps close and don't-have out of the Worker's registry, and clears an earlier answer", async () => {
    const db = await seeded();
    await saveAnswer(db, input({ answer: "have" }));
    await saveAnswer(db, input({ answer: "close", closeTo: "RabbitMQ" }));
    expect(await registry(db, "kafka")).toBeNull();
    expect((await answered(db))[0]).toMatchObject({ answer: "close", close_to: "RabbitMQ", resume_status: "todo" });
    await saveAnswer(db, input({ skillKey: "elixir", answer: "dont_have" }));
    expect(await registry(db, "elixir")).toBeNull();
  });

  it("refuses a skill that was never asked", async () => {
    expect(await saveAnswer(await seeded(), input({ skillKey: "cobol" }))).toBe(false);
  });
});
