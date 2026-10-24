import { describe, expect, it } from "vitest";
import { testDb } from "../../test/d1";
import { githubRepo, markNotNeeded, openResumePr, pending, syncPrs, type GitHub } from "./resume-pr";

const YAML = `skills:
  - name: Languages
    keywords:
      - { name: Java }
  - name: Cloud
    keywords:
      - { name: AWS }
work:
  - name: Hy-Vee, Inc.
    highlights:
      - Did things.
    technologies: [Vue.js]
`;

async function answer(db: D1Database, key: string, skill: string, answer: string, more: Record<string, string | null> = {}) {
  await db
    .prepare(`INSERT INTO skill_responses (skill_key, skill, answer, evidence_kind, evidence_id, close_to, note, resume_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(key, skill, answer, more.evidence_kind ?? null, more.evidence_id ?? null, more.close_to ?? null, more.note ?? null, more.status ?? "todo")
    .run();
}

function fakeGitHub(text = YAML) {
  const opened: Parameters<GitHub["openPr"]>[0][] = [];
  const states = new Map<number, "merged" | "closed" | "open">();
  const gh: GitHub = {
    readMain: async () => ({ text, blobSha: "blob1", headSha: "head1" }),
    openPr: async (input) => (opened.push(input), { number: 40 + opened.length, url: `https://github.com/pr/${40 + opened.length}` }),
    prState: async (n) => states.get(n) ?? "open",
  };
  return { gh, opened, states };
}

describe("openResumePr", () => {
  it("opens one PR for the batch, with job evidence going into technologies, and marks the answers", async () => {
    const db = testDb();
    await answer(db, "go", "Go", "have", { evidence_kind: "job", evidence_id: "job-hy-vee-inc" });
    await answer(db, "gcp", "GCP", "close", { close_to: "Google Cloud" });
    const { gh, opened } = fakeGitHub();

    const result = await openResumePr(db, gh, [
      { skillKey: "go", name: "Go", group: "Languages" },
      { skillKey: "gcp", name: "Google Cloud", group: "Cloud" },
    ], new Date("2026-10-23T21:05:00Z"));

    expect(result).toMatchObject({ ok: true, number: 41 });
    expect(opened[0]).toMatchObject({ branch: "resume-answers/202610232105", fromSha: "head1", blobSha: "blob1", title: "Resume: add Go, Google Cloud" });
    expect(opened[0].text).toContain("      - { name: Go }\n");
    expect(opened[0].text).toContain("technologies: [Vue.js, Go]");
    expect(opened[0].body).toContain('**Google Cloud**: added to Cloud. From "Something close" to GCP');
    expect((await pending(db)).map((r) => r.resume_pr)).toEqual([41, 41]);
  });

  it("refuses answers already in a PR, and marks a no-op batch as not needed instead of opening a PR", async () => {
    const db = testDb();
    await answer(db, "java", "Java", "have");
    await answer(db, "aws", "AWS", "have");
    const { gh, opened } = fakeGitHub();

    const noop = await openResumePr(db, gh, [{ skillKey: "java", name: "java", group: "Cloud" }]);
    expect(noop).toMatchObject({ ok: false, error: expect.stringContaining("nothing to change") });
    expect(opened).toEqual([]);
    expect(await db.prepare(`SELECT resume_status FROM skill_responses WHERE skill_key = 'java'`).first("resume_status")).toBe("not_needed");

    await db.prepare(`UPDATE skill_responses SET resume_pr = 7 WHERE skill_key = 'aws'`).run();
    expect(await openResumePr(db, gh, [{ skillKey: "aws", name: "AWS", group: "Cloud" }])).toMatchObject({ ok: false, error: expect.stringContaining("Reload") });
  });

  it("reports a bad group without opening anything", async () => {
    const db = testDb();
    await answer(db, "go", "Go", "have");
    const { gh, opened } = fakeGitHub();
    expect(await openResumePr(db, gh, [{ skillKey: "go", name: "Go", group: "Nope" }])).toMatchObject({ ok: false, error: expect.stringContaining("Nope") });
    expect(await openResumePr(db, gh, [])).toMatchObject({ ok: false });
    expect(opened).toEqual([]);
    expect((await pending(db))[0].resume_pr).toBeNull();
  });
});

describe("syncPrs", () => {
  it("marks merged answers done and puts closed ones back in the queue", async () => {
    const db = testDb();
    await answer(db, "go", "Go", "have");
    await answer(db, "rust", "Rust", "have");
    await answer(db, "zig", "Zig", "have");
    await db.prepare(`UPDATE skill_responses SET resume_pr = CASE skill_key WHEN 'go' THEN 1 WHEN 'rust' THEN 2 ELSE 3 END`).run();
    const { gh, states } = fakeGitHub();
    states.set(1, "merged").set(2, "closed");

    expect(await syncPrs(db, gh, await pending(db))).toBe(true);
    const rows = await db.prepare(`SELECT skill_key, resume_status, resume_pr FROM skill_responses ORDER BY skill_key`).all();
    expect(rows.results).toEqual([
      { skill_key: "go", resume_status: "done", resume_pr: 1 },
      { skill_key: "rust", resume_status: "todo", resume_pr: null },
      { skill_key: "zig", resume_status: "todo", resume_pr: 3 },
    ]);
    expect(await syncPrs(db, gh, await pending(db))).toBe(false);
  });
});

describe("markNotNeeded", () => {
  it("only touches queued answers", async () => {
    const db = testDb();
    await answer(db, "go", "Go", "have");
    await answer(db, "done", "Done", "have", { status: "done" });
    await markNotNeeded(db, ["go", "done"]);
    const rows = await db.prepare(`SELECT skill_key, resume_status FROM skill_responses ORDER BY skill_key`).all();
    expect(rows.results).toEqual([{ skill_key: "done", resume_status: "done" }, { skill_key: "go", resume_status: "not_needed" }]);
  });
});

describe("githubRepo", () => {
  it("round-trips non-ASCII text and makes the branch, commit, and PR calls in order", async () => {
    const calls: { method: string; url: string; body?: { content?: string } }[] = [];
    const text = "technologies: [AngularJS → Next.js]\n";
    const fetcher = (async (url: string, init: RequestInit) => {
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method: init.method ?? "GET", url, body });
      const json = url.includes("/contents/") && init.method === "GET"
        ? { content: Buffer.from(text).toString("base64").replace(/(.{20})/g, "$1\n"), sha: "b" }
        : url.endsWith("/git/ref/heads/main") ? { object: { sha: "h" } }
        : url.endsWith("/pulls") ? { number: 9, html_url: "u" } : {};
      return new Response(JSON.stringify(json), { status: 200 });
    }) as typeof fetch;
    const gh = githubRepo("t", fetcher);

    expect(await gh.readMain()).toEqual({ text, blobSha: "b", headSha: "h" });
    expect(await gh.openPr({ branch: "resume-answers/x", fromSha: "h", blobSha: "b", text, title: "T", body: "B" })).toEqual({ number: 9, url: "u" });
    expect(calls.slice(2).map((c) => `${c.method} ${c.url.replace("https://api.github.com/repos/rjrjensen/whoami", "")}`)).toEqual([
      "POST /git/refs",
      "PUT /contents/data/resume.yaml",
      "POST /pulls",
    ]);
    expect(Buffer.from(calls[3].body!.content!, "base64").toString()).toBe(text);
  });
});
