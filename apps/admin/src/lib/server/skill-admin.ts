// Ryan's edits to the skill names: rename a skill's display name, or move an alias to another skill (a merge or a split).
import { cleanSkill, tidySkill } from "#lib/skill-names.ts";

export type SkillRow = { id: number; name: string; aliases: { alias: string; source: string }[] };

export const MAX_NAME = 80;

/** Every skill with its aliases, by name. `q` matches the name or any alias. */
export async function listSkills(db: D1Database, q = ""): Promise<SkillRow[]> {
  const like = `%${q.trim().toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { results } = await db
    .prepare(
      `SELECT s.id, s.name, a.alias, a.source FROM skills s LEFT JOIN skill_aliases a ON a.skill_id = s.id
       WHERE ?1 = '%%' OR lower(s.name) LIKE ?1 ESCAPE '\\' OR s.id IN (SELECT skill_id FROM skill_aliases WHERE alias LIKE ?1 ESCAPE '\\')
       ORDER BY s.name COLLATE NOCASE, a.alias`,
    )
    .bind(like)
    .all<{ id: number; name: string; alias: string | null; source: string | null }>();
  const byId = new Map<number, SkillRow>();
  for (const r of results) {
    const row = byId.get(r.id) ?? byId.set(r.id, { id: r.id, name: r.name, aliases: [] }).get(r.id)!;
    if (r.alias) row.aliases.push({ alias: r.alias, source: r.source ?? "" });
  }
  return [...byId.values()];
}

const findByName = (db: D1Database, name: string) => db.prepare(`SELECT id, name FROM skills WHERE name = ?`).bind(name).first<{ id: number; name: string }>();

export type EditResult = { ok: true } | { ok: false; error: string };

/** Renames a skill. The new name also becomes an alias of it, so postings using it map here. */
export async function renameSkill(db: D1Database, id: number, rawName: string): Promise<EditResult> {
  const name = tidySkill(rawName).slice(0, MAX_NAME);
  if (!name) return { ok: false, error: "Enter a name." };
  const skill = await db.prepare(`SELECT id FROM skills WHERE id = ?`).bind(id).first();
  if (!skill) return { ok: false, error: "That skill no longer exists. Reload the page." };
  const clash = await findByName(db, name);
  if (clash && clash.id !== id) return { ok: false, error: `"${clash.name}" already exists. To combine them, move this skill's aliases to it.` };
  await db.batch([
    db.prepare(`UPDATE skills SET name = ? WHERE id = ?`).bind(name, id),
    db.prepare(`INSERT INTO skill_aliases (alias, skill_id, source) VALUES (?, ?, 'ryan') ON CONFLICT (alias) DO NOTHING`).bind(cleanSkill(name), id),
  ]);
  return { ok: true };
}

/**
 * Moves an alias to the skill named `toName`, creating that skill if it's new. A skill left with no aliases is deleted,
 * since nothing can map to it any more.
 */
export async function moveAlias(db: D1Database, alias: string, fromId: number, toName: string): Promise<EditResult & { created?: boolean }> {
  const name = tidySkill(toName).slice(0, MAX_NAME);
  if (!name) return { ok: false, error: "Enter the skill to move it to." };
  const row = await db.prepare(`SELECT skill_id FROM skill_aliases WHERE alias = ?`).bind(alias).first<{ skill_id: number }>();
  if (!row || row.skill_id !== fromId) return { ok: false, error: "That alias has moved since the page loaded. Reload the page." };
  const target = await findByName(db, name);
  if (target?.id === fromId) return { ok: false, error: `"${alias}" is already an alias of ${target.name}.` };
  await db.batch([
    db.prepare(`INSERT INTO skills (name) VALUES (?) ON CONFLICT (name) DO NOTHING`).bind(name),
    db.prepare(`UPDATE skill_aliases SET skill_id = (SELECT id FROM skills WHERE name = ?), source = 'ryan' WHERE alias = ?`).bind(name, alias),
    db.prepare(`DELETE FROM skills WHERE id = ? AND NOT EXISTS (SELECT 1 FROM skill_aliases WHERE skill_id = ?)`).bind(fromId, fromId),
  ]);
  return { ok: true, created: !target };
}
