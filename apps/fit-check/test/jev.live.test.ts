// Calls the real Jev API. Runs only with JEV_API_KEY set: `JEV_API_KEY=... npx vitest run test/jev.live.test.ts`.
import { describe, expect, it } from "vitest";
import { JevMatcher } from "../src/match";
import type { Requirement } from "../src/report";

describe.skipIf(!process.env.JEV_API_KEY)("Jev (live)", () => {
  it("classifies requirements against the record", { timeout: 30_000 }, async () => {
    const reqs: Requirement[] = [
      { text: "3+ years building backend services in Kotlin", importance: "must", kind: "skill", skill: "Kotlin", relatedSkills: ["Kotlin"] },
      { text: "Experience supervising or managing a team", importance: "must", kind: "experience", skill: "People management", relatedSkills: [] },
      { text: "Production experience writing Rust", importance: "nice", kind: "skill", skill: "Rust", relatedSkills: [] },
      { text: "Experience with Micronaut", importance: "nice", kind: "skill", skill: "Micronaut", relatedSkills: ["Kotlin"] },
    ];
    const jd = "Engineering Manager. Required: 3+ years of Kotlin backend services and experience managing a team. Nice to have: Rust and Micronaut.";
    const out = await new JevMatcher(process.env.JEV_API_KEY!).match(reqs, jd);
    console.log(JSON.stringify(out, null, 2));
    expect(out).toHaveLength(4);
    expect(out[1].coverage).toBe("demonstrated");
    expect(out[1].evidenceId).toMatch(/^job-/);
    expect(out[2].coverage).toBe("gap");
    expect(out.map((m) => m.importance)).toEqual(["must", "must", "nice", "nice"]);
  });
});
