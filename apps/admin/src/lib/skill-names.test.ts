import { describe, expect, it } from "vitest";
import { testDb } from "../test/d1";
import { resolveSkills } from "./server/skills";
import { cleanSkill, knownSkills, looseSkill, matchSkill, variantsOf } from "./skill-names";

describe("tidying", () => {
  it("handles case, whitespace, quotes, and stray punctuation", () => {
    expect(cleanSkill("  NodeJS. ")).toBe("nodejs");
    expect(cleanSkill("• “Kubernetes”,")).toBe("kubernetes");
    expect(cleanSkill(".NET")).toBe(".net");
    expect(cleanSkill("C#")).toBe("c#");
  });

  it("matches spelling variants loosely", () => {
    expect(looseSkill("Node.js")).toBe(looseSkill("node js"));
    expect(looseSkill("C++")).not.toBe(looseSkill("C#"));
  });

  it("splits combined names into variants", () => {
    expect(variantsOf("CSS / Sass / Less")).toEqual(["CSS / Sass / Less", "CSS", "Sass", "Less"]);
    expect(variantsOf("Linux (cron)")).toEqual(["Linux (cron)", "Linux"]);
  });
});

describe("matchSkill", () => {
  const known = knownSkills(["Node.js", "React / Next.js", "Kubernetes"]);
  it("uses the alias map, then known names and their variants", () => {
    expect(matchSkill("NodeJS", known)).toBe("Node.js");
    expect(matchSkill("K8s", known)).toBe("Kubernetes");
    expect(matchSkill("Next.js", known)).toBe("React / Next.js");
  });
  it("returns null for a new skill", () => {
    expect(matchSkill("Rust", known)).toBeNull();
  });
});

describe("resolveSkills", () => {
  it("maps variants of one skill to one id, and saves unseen variants as aliases", async () => {
    const db = testDb();
    const map = await resolveSkills(db, ["NodeJS", "node.js", "Node JS", "Rust", "rust ", "K8s"]);
    expect(new Set(["NodeJS", "node.js", "Node JS"].map((n) => map.get(n)?.name))).toEqual(new Set(["Node.js"]));
    expect(map.get("Rust")).toEqual(map.get("rust "));
    expect(map.get("Rust")?.name).toBe("Rust");
    expect(map.get("K8s")?.name).toBe("Kubernetes");
    const saved = await db.prepare(`SELECT alias, source FROM skill_aliases WHERE alias IN ('node js', 'rust')`).all<{ alias: string; source: string }>();
    expect(saved.results).toEqual(expect.arrayContaining([{ alias: "node js", source: "code" }, { alias: "rust", source: "code" }]));
  });

  it("follows an alias Ryan moved to another skill", async () => {
    const db = testDb();
    const before = await resolveSkills(db, ["Golang"]);
    expect(before.get("Golang")?.name).toBe("Go");
    await db.prepare(`INSERT INTO skills (name) VALUES ('Go (language)')`).run();
    await db.prepare(`UPDATE skill_aliases SET skill_id = (SELECT id FROM skills WHERE name = 'Go (language)'), source = 'ryan' WHERE alias = 'golang'`).run();
    expect((await resolveSkills(db, ["Golang"])).get("Golang")?.name).toBe("Go (language)");
  });
});
