import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { applyAdditions, scalar, skillGroups } from "./resume-edit";

const RESUME = readFileSync(new URL("../../../../data/resume.yaml", import.meta.url), "utf8");

const SMALL = `# comment kept
skills:
  - name: Languages
    keywords:
      - { name: "C#", proficient: true }
      - { name: HTML, variants: [base, lead] }

  - name: Cloud
    keywords:
      - { name: AWS }
work:
  - name: Hy-Vee, Inc.
    highlights:
      - Did things.
    technologies: [Vue.js, "C#"]

  - name: UPS
    highlights:
      - Sorted packages.
`;

const keywords = (yaml: string, group: string) =>
  parse(yaml).skills.find((g: { name: string }) => g.name === group).keywords.map((k: { name: string }) => k.name);
const tech = (yaml: string, job: string) => parse(yaml).work.find((w: { name: string }) => w.name === job).technologies;

describe("applyAdditions", () => {
  it("adds a keyword line and a technology without touching anything else", () => {
    const { yaml, outcomes } = applyAdditions(SMALL, [{ skill: " Go ", group: "Languages", evidenceId: "job-hy-vee-inc" }]);
    expect(yaml).toBe(
      SMALL.replace(`variants: [base, lead] }\n`, `variants: [base, lead] }\n      - { name: Go }\n`).replace(`"C#"]`, `"C#", Go]`),
    );
    expect(outcomes).toEqual([{ skill: "Go", changes: ["added to Languages", "added to Hy-Vee, Inc.'s technologies"] }]);
  });

  it("adds a technologies list to a job that has none", () => {
    const { yaml } = applyAdditions(SMALL, [{ skill: "Kanban", group: "Cloud", evidenceId: "job-ups" }]);
    expect(tech(yaml, "UPS")).toEqual(["Kanban"]);
    expect(yaml).toContain("      - Sorted packages.\n    technologies: [Kanban]\n");
    expect(keywords(yaml, "Cloud")).toEqual(["AWS", "Kanban"]);
  });

  it("skips what's already there, in any case and group, and applies several in order", () => {
    const { yaml, outcomes } = applyAdditions(SMALL, [
      { skill: "c#", group: "Cloud", evidenceId: "job-hy-vee-inc" },
      { skill: "GCP", group: "Cloud", evidenceId: null },
      { skill: "Azure", group: "cloud", evidenceId: null },
    ]);
    expect(outcomes[0].changes).toEqual(["already under Languages", "already in Hy-Vee, Inc.'s technologies"]);
    expect(keywords(yaml, "Cloud")).toEqual(["AWS", "GCP", "Azure"]);
  });

  it("refuses an unknown group or job", () => {
    expect(() => applyAdditions(SMALL, [{ skill: "Go", group: "Nope", evidenceId: null }])).toThrow(/no "Nope" group/);
    expect(() => applyAdditions(SMALL, [{ skill: "Go", group: "Cloud", evidenceId: "job-nope" }])).toThrow(/no job/);
  });

  it("edits the real resume.yaml by adding lines only", () => {
    const groups = skillGroups(RESUME);
    expect(groups).toContain("Languages");
    const { yaml } = applyAdditions(RESUME, [{ skill: "Rust", group: groups[0], evidenceId: "job-ups" }]);
    expect(keywords(yaml, groups[0])).toContain("Rust");
    expect(tech(yaml, "UPS")).toContain("Rust");
    const before = RESUME.split("\n");
    const after = yaml.split("\n");
    expect(after.filter((l) => !before.includes(l)).length).toBeLessThanOrEqual(2);
    expect(before.every((l) => after.includes(l) || /technologies:/.test(l))).toBe(true);
  });
});

describe("scalar", () => {
  it("quotes only when plain YAML wouldn't read back the same", () => {
    expect(scalar("Go")).toBe("Go");
    expect(scalar("Node.js")).toBe("Node.js");
    expect(scalar("C#")).toBe('"C#"');
    expect(scalar("CI: GitHub")).toBe('"CI: GitHub"');
    expect(scalar("true")).toBe('"true"');
    expect(scalar("1.0")).toBe('"1.0"');
    for (const s of ["C#", "true", "a, b", "[x]", "Go"]) expect(parse(`[${scalar(s)}]`)[0]).toBe(s);
  });
});
