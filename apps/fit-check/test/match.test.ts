import { afterEach, describe, expect, it, vi } from "vitest";
import { JevMatcher, matchWithFallback, type Matcher } from "../src/match";
import type { Requirement } from "../src/report";

const reqs: Requirement[] = [
  { text: "Kotlin", importance: "must", kind: "skill", skill: "Kotlin", relatedSkills: ["Kotlin"] },
  { text: "Rust", importance: "nice", kind: "skill", skill: "Rust", relatedSkills: [] },
];

afterEach(() => vi.unstubAllGlobals());

describe("JevMatcher", () => {
  it("sends three choice questions per requirement, with the job description in the state", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(Object.keys(body.questions)).toEqual(["imp_0", "cov_0", "ev_0", "imp_1", "cov_1", "ev_1"]);
      expect(body.state.job_description).toBe("the posting");
      expect(body.questions.ev_0.criteria).toHaveProperty("job-hy-vee-inc");
      return Response.json({
        answers: {
          imp_0: { type: "choice", choice: "must", probabilities: {}, confidence: 0.9 },
          imp_1: { type: "choice", choice: "nice", probabilities: {}, confidence: 0.7 },
          cov_0: { type: "choice", choice: "demonstrated", probabilities: {}, confidence: 0.91 },
          ev_0: { type: "choice", choice: "job-hy-vee-inc", probabilities: { "job-hy-vee-inc": 0.7 }, confidence: 0.6 },
          cov_1: { type: "choice", choice: "gap", probabilities: {}, confidence: 0.8 },
          ev_1: { type: "choice", choice: "none", probabilities: { none: 0.9 }, confidence: 0.8 },
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await new JevMatcher("k").match(reqs, "the posting");
    expect(out).toEqual([
      { importance: "must", coverage: "demonstrated", confidence: 0.91, evidenceId: "job-hy-vee-inc", evidenceProbability: 0.7 },
      { importance: "nice", coverage: "gap", confidence: 0.8, evidenceId: null, evidenceProbability: null },
    ]);
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: "Bearer k" });
  });

  it("retries when Jev is overloaded, then throws on errors", async () => {
    const fetchMock = vi.fn(async () => new Response("busy", { status: 529, headers: { "Retry-After": "0" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new JevMatcher("k").match(reqs, "the posting")).rejects.toThrow("529");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("matchWithFallback", () => {
  const fake = (name: "jev" | "claude", impl: Matcher["match"]): Matcher => ({ name, match: impl });

  it("falls back to the second matcher when the first fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await matchWithFallback(
      fake("jev", async () => Promise.reject(new Error("down"))),
      fake("claude", async (r) => r.map(() => ({ importance: null, coverage: "gap", confidence: null, evidenceId: null, evidenceProbability: null }))),
      reqs,
      "the posting",
    );
    expect(result.matcher).toBe("claude");
  });

  it("skips straight to the fallback when Jev isn't configured", async () => {
    const result = await matchWithFallback(null, fake("claude", async () => []), reqs, "the posting");
    expect(result.matcher).toBe("claude");
  });
});
