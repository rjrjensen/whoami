import { describe, expect, it } from "vitest";
import type { Importance, ReportItem } from "@ryanjensen/fit-check/report";
import { testDb } from "../test/d1";
import type { SkillRef } from "./server/skills";
import { loadTrends } from "./server/trends";
import { addMonths, computeTrends, distinctPostings, pickStatus, pts, type SkillStatus, type TrendReport, type TrendRow } from "./trends";

const item = (skill: string, importance: Importance = "must", status: ReportItem["status"] = "unconfirmed"): ReportItem => ({
  requirement: skill,
  importance,
  skill,
  status,
  inferred: false,
  reason: "",
  evidence: [],
});
const report = (items: ReportItem[], role: Partial<TrendReport["role"]> = {}): TrendReport => ({
  id: crypto.randomUUID(),
  createdAt: "",
  role: { title: "Engineering Manager", company: "Example Co", type: "engineering_manager", ...role },
  score: 50,
  label: "Partial fit",
  explanation: "",
  items,
  strengths: [],
  recommendedVersion: "manager",
  matcher: "claude",
  cached: false,
});
let n = 0;
const row = (month: string, items: ReportItem[], over: Partial<TrendRow> = {}): TrendRow => ({
  jd_hash: `hash-${n++}`,
  created_at: `${month}-15 12:00:00`,
  source: "visitor",
  report: report(items),
  ...over,
});

// A resolver result: NodeJS and Node.js are one skill.
const ids: Record<string, SkillRef> = {
  Rust: { id: 1, name: "Rust" },
  NodeJS: { id: 2, name: "Node.js" },
  "Node.js": { id: 2, name: "Node.js" },
  Kotlin: { id: 3, name: "Kotlin" },
};
const skillOf = new Map(Object.entries(ids));
const statusOf = new Map<number, SkillStatus>([
  [1, "gap"],
  [2, "have"],
  [3, "have"],
]);

describe("distinctPostings", () => {
  it("counts a repeated posting once, in the month it was first pasted, from its first report", () => {
    const rows = [
      row("2026-10", [item("Kotlin")], { jd_hash: "same" }),
      row("2026-09", [item("Rust")], { jd_hash: "same" }),
    ];
    const postings = distinctPostings(rows, skillOf);
    expect(postings).toHaveLength(1);
    expect(postings[0].month).toBe("2026-09");
    expect([...postings[0].skills.keys()]).toEqual([1]);
  });

  it("dedupes variants of one skill per posting, and must beats nice", () => {
    const [p] = distinctPostings([row("2026-10", [item("NodeJS", "nice"), item("Node.js", "must"), item("NodeJS", "nice")])], skillOf);
    expect([...p.skills]).toEqual([[2, "must"]]);
  });
});

describe("computeTrends", () => {
  const rows = [
    // Baseline: Jul–Sep, 4 postings, Rust in 1.
    row("2026-07", [item("Rust"), item("Kotlin")]),
    row("2026-08", [item("Kotlin")]),
    row("2026-09", [item("Kotlin", "nice")]),
    row("2026-09", [item("NodeJS")]),
    // October: 2 postings, Rust in both.
    row("2026-10", [item("Rust"), item("Node.js", "nice")]),
    row("2026-10", [item("Rust", "nice")]),
    // Too old for the baseline.
    row("2026-05", [item("Kotlin")]),
  ];

  it("gives each skill's share of the month's postings, split into must and nice", () => {
    const t = computeTrends(rows, skillOf, statusOf);
    expect(t.month).toBe("2026-10");
    expect(t.monthN["2026-10"]).toBe(2);
    const rust = t.snapshot.find((r) => r.name === "Rust")!;
    expect(rust).toMatchObject({ must: 1, nice: 1, share: 1, mustShare: 0.5, niceShare: 0.5 });
    expect(t.snapshot.find((r) => r.name === "Node.js")).toMatchObject({ must: 0, nice: 1, share: 0.5 });
  });

  it("compares with the pooled previous 3 months, at any sample size", () => {
    const t = computeTrends(rows, skillOf, statusOf);
    expect(t.baseline).toEqual({ months: ["2026-07", "2026-08", "2026-09"], n: 4 });
    const rust = t.rising.find((c) => c.name === "Rust")!;
    expect(rust.baselineShare).toBe(0.25);
    expect(rust.delta).toBeCloseTo(0.75);
    expect(t.rising[0].name).toBe("Rust"); // sorted by change
    const kotlin = t.falling.find((c) => c.name === "Kotlin")!;
    expect(kotlin).toMatchObject({ share: 0, baselineShare: 0.75 });
    expect(pts(kotlin.delta)).toBe("−75 pts");
  });

  it("has nothing to compare when the previous months are empty", () => {
    const t = computeTrends(rows, skillOf, statusOf, { month: "2026-05" });
    expect(t.baseline.n).toBe(0);
    expect(t.rising).toEqual([]);
    expect(t.falling).toEqual([]);
  });

  it("lists in-demand gaps", () => {
    expect(computeTrends(rows, skillOf, statusOf).gaps.map((g) => g.name)).toEqual(["Rust"]);
  });

  it("filters by source, role type, and industry, and only offers filters the data has", () => {
    const mixed = [
      row("2026-10", [item("Rust")], { source: "ryan" }),
      row("2026-10", [item("Kotlin")], { report: report([item("Kotlin")], { type: "lead_engineer", industry: "insurance" }) }),
    ];
    expect(computeTrends(mixed, skillOf, statusOf, { source: "ryan" }).postings).toBe(1);
    const lead = computeTrends(mixed, skillOf, statusOf, { roleType: "lead_engineer" });
    expect(lead.snapshot.map((r) => r.name)).toEqual(["Kotlin"]);
    const t = computeTrends(mixed, skillOf, statusOf);
    expect(t.options).toMatchObject({ industries: ["insurance"], roleTypes: ["engineering_manager", "lead_engineer"], seniorities: [], sources: ["ryan", "visitor"] });
    expect(t.industries).toEqual([{ name: "insurance", byMonth: { "2026-10": 1 } }]);
    expect(computeTrends(rows, skillOf, statusOf).industries).toEqual([]);
  });

  it("handles no postings", () => {
    const t = computeTrends([], skillOf, statusOf);
    expect(t).toMatchObject({ postings: 0, month: null, snapshot: [], rising: [] });
  });
});

describe("helpers", () => {
  it("steps months across years", () => {
    expect(addMonths("2026-02", -3)).toBe("2025-11");
  });

  it("picks Ryan's status from his answer, then the registry, the resume, and the latest report", () => {
    expect(pickStatus({ response: "dont_have", answer: "have", onResume: true })).toBe("gap");
    expect(pickStatus({ response: "close", onResume: false })).toBe("close");
    expect(pickStatus({ answer: "learning", onResume: true })).toBe("learning");
    expect(pickStatus({ onResume: true, latest: "unconfirmed" })).toBe("have");
    expect(pickStatus({ onResume: false, latest: "transferable" })).toBe("close");
    expect(pickStatus({ onResume: false })).toBe("gap");
  });
});

describe("loadTrends", () => {
  it("reads D1, resolves skill names, and uses Ryan's answers", async () => {
    const db = testDb();
    const add = (id: string, hash: string, at: string, items: ReportItem[]) =>
      db
        .prepare(`INSERT INTO fit_checks (id, created_at, jd_hash, score, report_json, matcher, ip_hash) VALUES (?, ?, ?, 50, ?, 'claude', 'x')`)
        .bind(id, at, hash, JSON.stringify(report(items)))
        .run();
    await add("a", "h1", "2026-10-01 10:00:00", [item("NodeJS"), item("Rust")]);
    await add("b", "h2", "2026-10-02 10:00:00", [item("node.js", "nice")]);
    await add("c", "h1", "2026-10-03 10:00:00", [item("NodeJS"), item("Rust")]); // a repeat
    await db.prepare(`INSERT INTO skill_responses (skill_key, skill, answer) VALUES ('rust', 'Rust', 'learning')`).run();

    const t = await loadTrends(db, {});
    expect(t.postings).toBe(2);
    expect(t.snapshot.find((r) => r.name === "Node.js")).toMatchObject({ must: 1, nice: 1, share: 1, status: "have" });
    expect(t.snapshot.find((r) => r.name === "Rust")).toMatchObject({ share: 0.5, status: "learning" });
  });
});
