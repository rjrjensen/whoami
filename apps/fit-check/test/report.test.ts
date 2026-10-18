import { describe, expect, it } from "vitest";
import { buildReport, explain, judge, labelFor, score, type Importance, type Match, type ReportItem, type Requirement, type Status } from "../src/report";

const req = (over: Partial<Requirement> = {}): Requirement => ({
  text: "5+ years of Kotlin",
  importance: "must",
  kind: "skill",
  skill: "Kotlin",
  relatedSkills: ["Kotlin"],
  ...over,
});
const match = (over: Partial<Match> = {}): Match => ({ importance: null, coverage: "demonstrated", confidence: 0.9, evidenceId: null, evidenceProbability: null, ...over });

describe("judge", () => {
  it("demonstrates a skill with evidence from the jobs that used it", () => {
    const item = judge(req(), match(), undefined);
    expect(item.status).toBe("demonstrated");
    expect(item.inferred).toBe(false);
    expect(item.evidence.map((e) => e.id)).toContain("job-hy-vee-inc");
  });

  it("downgrades a demonstrated claim with no evidence to transferable when a related skill exists", () => {
    const item = judge(req({ relatedSkills: ["JavaScript"] }), match(), undefined); // JavaScript has no jobs in the record
    expect(item.status).toBe("transferable");
    expect(item.inferred).toBe(true);
    expect(item.reason).toContain("JavaScript");
  });

  it("downgrades a demonstrated claim with nothing to point at to unconfirmed", () => {
    expect(judge(req({ relatedSkills: [] }), match(), undefined).status).toBe("unconfirmed");
  });

  it("ignores related skills that aren't in the record", () => {
    expect(judge(req({ relatedSkills: ["COBOL"] }), match(), undefined).status).toBe("unconfirmed");
  });

  it("uses the matcher's evidence pick only when it's reasonably sure", () => {
    const r = req({ relatedSkills: [], text: "Has supervised a team" });
    expect(judge(r, match({ evidenceId: "job-ups", evidenceProbability: 0.8 }), undefined).status).toBe("demonstrated");
    expect(judge(r, match({ evidenceId: "job-ups", evidenceProbability: 0.3 }), undefined).status).toBe("unconfirmed");
    expect(judge(r, match({ evidenceId: "not-a-real-id", evidenceProbability: 0.9 }), undefined).status).toBe("unconfirmed");
  });

  it("needs confidence for transferable", () => {
    const r = req({ skill: "Micronaut", relatedSkills: ["Kotlin"] });
    expect(judge(r, match({ coverage: "transferable", confidence: 0.8 }), undefined).status).toBe("transferable");
    expect(judge(r, match({ coverage: "transferable", confidence: 0.3 }), undefined).status).toBe("unconfirmed");
    // The Claude fallback has no calibrated confidence; transferable still needs a reason.
    expect(judge(r, match({ coverage: "transferable", confidence: null }), undefined).status).toBe("transferable");
  });

  it("takes importance from the matcher when it has one, otherwise from extraction", () => {
    expect(judge(req(), match({ importance: "nice" }), undefined).importance).toBe("nice");
    expect(judge(req(), match(), undefined).importance).toBe("must");
  });

  it("lets Ryan's answers override the matcher", () => {
    const gap = match({ coverage: "gap" });
    expect(judge(req(), gap, { status: "have", evidenceId: "job-ups", note: null }).status).toBe("demonstrated");
    expect(judge(req(), match(), { status: "learning", evidenceId: null, note: null }).status).toBe("learning");
    expect(judge(req(), match(), { status: "not_pursuing", evidenceId: null, note: "Not for me." }).reason).toBe("Not for me.");
  });
});

describe("score", () => {
  const item = (status: Status, importance: Importance = "must") => ({ status, importance }) as ReportItem;

  it("weighs must-haves three times nice-to-haves", () => {
    expect(score([item("demonstrated"), item("unconfirmed", "nice")])).toBe(75);
    expect(score([item("unconfirmed"), item("demonstrated", "nice")])).toBe(25);
  });

  it("gives partial credit for transferable and learning", () => {
    expect(score([item("transferable")])).toBe(60);
    expect(score([item("learning")])).toBe(25);
    expect(score([item("not_focus")])).toBe(0);
    expect(score([])).toBe(0);
  });

  it("labels bands", () => {
    expect([labelFor(80), labelFor(79), labelFor(60), labelFor(40), labelFor(39)]).toEqual(["Strong fit", "Good fit", "Good fit", "Partial fit", "Stretch"]);
  });
});

describe("explain", () => {
  it("counts must-haves in plain language", () => {
    const items = [
      { status: "demonstrated", importance: "must" },
      { status: "transferable", importance: "must" },
      { status: "unconfirmed", importance: "must" },
      { status: "demonstrated", importance: "nice" },
    ] as ReportItem[];
    expect(explain(items)).toBe("Ryan's record directly shows 1 of 3 must-haves, and 1 more through related experience. 1 hasn't been confirmed yet.");
  });
});

describe("buildReport", () => {
  it("assembles a report and recommends the version for the role", () => {
    const report = buildReport(
      { isJobDescription: true, roleTitle: "Engineering Manager", company: "Acme", roleType: "engineering_manager", requirements: [req(), req({ skill: "Rust", relatedSkills: [] })] },
      [match(), match({ coverage: "gap" })],
      new Map(),
      { id: "x", createdAt: "2026-10-17T00:00:00.000Z", matcher: "jev" },
    );
    expect(report.recommendedVersion).toBe("manager");
    expect(report.items.map((i) => i.status)).toEqual(["demonstrated", "unconfirmed"]);
    expect(report.score).toBe(50);
    expect(report.strengths).toHaveLength(1);
  });
});
