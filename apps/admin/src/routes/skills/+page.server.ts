// Skill names: one display name per skill, with every variant postings use as an alias.
import { env } from "cloudflare:workers";
import { fail } from "@sveltejs/kit";
import { requireAdmin } from "#lib/server/auth.ts";
import { listSkills, moveAlias, renameSkill } from "#lib/server/skill-admin.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const q = event.url.searchParams.get("q")?.slice(0, 80) ?? "";
  const db = env.DB;
  const [skills, all] = await Promise.all([listSkills(db, q), db.prepare(`SELECT name FROM skills ORDER BY name COLLATE NOCASE`).all<{ name: string }>()]);
  return { q, skills, names: all.results.map((r) => r.name) };
};

export const actions: Actions = {
  rename: async (event) => {
    requireAdmin(event);
    const form = await event.request.formData();
    const id = Number(form.get("id"));
    const result = await renameSkill(env.DB, id, String(form.get("name") ?? ""));
    return result.ok ? { done: "Renamed.", id } : fail(400, { id, action: "rename", error: result.error });
  },
  move: async (event) => {
    requireAdmin(event);
    const form = await event.request.formData();
    const id = Number(form.get("id"));
    const alias = String(form.get("alias") ?? "");
    const to = String(form.get("to") ?? "");
    const result = await moveAlias(env.DB, alias, id, to);
    return result.ok ? { done: `Moved "${alias}" to ${to.trim()}${result.created ? " (a new skill)" : ""}.`, id } : fail(400, { id, action: "move", error: result.error });
  },
};
