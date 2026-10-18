import { describe, expect, it } from "vitest";
import { testDb } from "../../test/d1";
import { listSkills, moveAlias, renameSkill } from "./skill-admin";
import { resolveSkills } from "./skills";

const idOf = (db: D1Database, name: string) => db.prepare(`SELECT id FROM skills WHERE name = ?`).bind(name).first<number>("id");

describe("listSkills", () => {
  it("lists seeded skills with their aliases and finds them by alias", async () => {
    const db = testDb();
    const css = (await listSkills(db)).find((s) => s.name === "CSS / Sass / Less");
    expect(css?.aliases.map((a) => a.alias)).toEqual(expect.arrayContaining(["css", "sass", "less"]));
    expect((await listSkills(db, "k8s")).map((s) => s.name)).toEqual(["Kubernetes"]);
    expect(await listSkills(db, "no-such-skill")).toEqual([]);
  });
});

describe("renameSkill", () => {
  it("renames and adds the new name as an alias", async () => {
    const db = testDb();
    const id = (await idOf(db, "Kubernetes"))!;
    expect(await renameSkill(db, id, " K8s / Kubernetes ")).toEqual({ ok: true });
    expect((await resolveSkills(db, ["k8s / kubernetes"])).get("k8s / kubernetes")?.id).toBe(id);
  });

  it("refuses a name another skill has, in any case, but allows a case change", async () => {
    const db = testDb();
    const id = (await idOf(db, "Kubernetes"))!;
    expect(await renameSkill(db, id, "docker")).toMatchObject({ ok: false, error: expect.stringContaining("Docker") });
    expect(await renameSkill(db, id, "KUBERNETES")).toEqual({ ok: true });
  });
});

describe("moveAlias", () => {
  it("splits an alias into a new skill, then merges it back and deletes the empty skill", async () => {
    const db = testDb();
    const react = (await idOf(db, "React / Next.js"))!;
    expect(await moveAlias(db, "next.js", react, "Next.js")).toEqual({ ok: true, created: true });
    const next = (await idOf(db, "Next.js"))!;
    expect((await resolveSkills(db, ["Next.js"])).get("Next.js")?.name).toBe("Next.js");
    expect(await db.prepare(`SELECT source FROM skill_aliases WHERE alias = 'next.js'`).first("source")).toBe("ryan");

    expect(await moveAlias(db, "next.js", next, "react / next.js")).toEqual({ ok: true, created: false });
    expect(await idOf(db, "Next.js")).toBeNull();
  });

  it("refuses a stale or pointless move", async () => {
    const db = testDb();
    const react = (await idOf(db, "React / Next.js"))!;
    expect(await moveAlias(db, "next.js", react + 1, "Next.js")).toMatchObject({ ok: false });
    expect(await moveAlias(db, "next.js", react, "React / Next.js")).toMatchObject({ ok: false });
    expect(await moveAlias(db, "next.js", react, "  ")).toMatchObject({ ok: false });
  });
});
