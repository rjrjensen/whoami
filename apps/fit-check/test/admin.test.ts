import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Extraction, Match } from "../src/report";

// The Worker runtime module isn't available under Node; a plain base class stands in.
vi.mock("cloudflare:workers", () => ({
  WorkerEntrypoint: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
vi.mock("../src/db", () => ({
  cachedReport: vi.fn(async () => null),
  checksThisMonth: vi.fn(async () => 0),
  saveCheck: vi.fn(async () => {}),
  skillAnswers: vi.fn(async () => new Map()),
  getReport: vi.fn(),
  distinctPostings: vi.fn(),
  lastDay: vi.fn(),
  reachMilestone: vi.fn(),
}));
const extraction: Extraction = {
  isJobDescription: true,
  roleTitle: "Engineering Manager",
  company: "Example Co",
  roleType: "engineering_manager",
  requirements: [{ text: "Rust", importance: "must", kind: "skill", skill: "Rust", relatedSkills: [] }],
};
vi.mock("../src/extract", () => ({
  extractRequirements: vi.fn(async () => ({ extraction, model: "test-model", usage: { input: 1, output: 1 } })),
  ExtractionFailed: class extends Error {},
  NotAJobDescription: class extends Error {},
}));
const gap: Match = { importance: null, coverage: "gap", confidence: 0.9, evidenceId: null, evidenceProbability: null };
vi.mock("../src/match", () => ({
  matchWithFallback: vi.fn(async () => ({ matches: [gap], matcher: "claude" })),
  JevMatcher: class {},
  ClaudeMatcher: class {},
}));
vi.mock("../src/notify", () => ({ notify: vi.fn(), notifyDay: vi.fn(), notifyGaps: vi.fn(async () => {}) }));

const { saveCheck } = await import("../src/db");
const { notifyGaps } = await import("../src/notify");
const { Admin, default: worker } = await import("../src/index");

const env = {
  DB: {},
  LIMITER: { limit: async () => ({ success: true }) },
  ALLOWED_ORIGINS: "https://ryanjensen.dev",
  MONTHLY_CAP: "300",
  ANTHROPIC_API_KEY: "test",
  IP_HASH_SALT: "salt",
  ALLOW_NO_TURNSTILE: "1",
  SITE_URL: "https://ryanjensen.dev",
  NTFY_SERVER: "https://ntfy.example",
  NTFY_TOPIC: "topic",
};
const posting = "Requirements: Rust, people leadership, and a fake posting for tests. ".repeat(5);

beforeEach(() => vi.clearAllMocks());

describe("Admin.checkFromAdmin", () => {
  // @ts-expect-error the stand-in base class takes (ctx, env)
  const admin = new Admin({}, env);

  it("runs the check and saves it as Ryan's, without pushing", async () => {
    const result = await admin.checkFromAdmin(posting);
    expect("report" in result && result.report.role.title).toBe("Engineering Manager");
    expect(saveCheck).toHaveBeenCalledOnce();
    expect(vi.mocked(saveCheck).mock.calls[0][1]).toMatchObject({ source: "ryan", ipHash: "admin", jdText: posting });
    expect(notifyGaps).not.toHaveBeenCalled();
  });

  it("rejects text that's too short, without saving", async () => {
    expect(await admin.checkFromAdmin("too short")).toMatchObject({ error: "too_short" });
    expect(saveCheck).not.toHaveBeenCalled();
  });
});

describe("POST /fit-check", () => {
  it("still saves visitor checks as 'visitor' and pushes the gaps", async () => {
    const request = new Request("https://api.ryanjensen.dev/fit-check", { method: "POST", body: JSON.stringify({ jobDescription: posting }) });
    const waits: Promise<unknown>[] = [];
    const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException() {}, props: {} };
    // @ts-expect-error a partial Env and ExecutionContext are enough here
    const res = await worker.fetch(request, env, ctx);
    expect(res.status).toBe(200);
    expect(vi.mocked(saveCheck).mock.calls[0][1]).toMatchObject({ source: "visitor" });
    await Promise.all(waits);
    expect(notifyGaps).toHaveBeenCalledOnce();
  });
});
