// The one place raw skill names from postings become skills (see lib/skill-names.ts for the steps).
import { RECORD } from "@ryanjensen/fit-check/record";
import { cleanSkill, knownSkills, matchSkill, tidySkill } from "#lib/skill-names.ts";

export type SkillRef = { id: number; name: string };

/** D1 allows 100 bound parameters per statement. */
const CHUNK = 90;
const chunks = <T>(xs: T[]) => Array.from({ length: Math.ceil(xs.length / CHUNK) }, (_, i) => xs.slice(i * CHUNK, (i + 1) * CHUNK));

async function lookup(db: D1Database, aliases: string[]) {
  const found = new Map<string, SkillRef>();
  for (const part of chunks(aliases)) {
    const { results } = await db
      .prepare(`SELECT a.alias, s.id, s.name FROM skill_aliases a JOIN skills s ON s.id = a.skill_id WHERE a.alias IN (${part.map(() => "?").join(",")})`)
      .bind(...part)
      .all<{ alias: string; id: number; name: string }>();
    for (const r of results) found.set(r.alias, { id: r.id, name: r.name });
  }
  return found;
}

/**
 * Raw names → skills. Known variants are a lookup; an unseen one is matched (in code today, Jev later) and saved
 * as a new alias, of an existing skill or of a new skill named after the variant, so the next lookup is free.
 */
export async function resolveSkills(db: D1Database, rawNames: string[]): Promise<Map<string, SkillRef>> {
  const byAlias = new Map<string, string>(); // alias → first raw spelling seen, used as a new skill's display name
  for (const raw of rawNames) {
    const alias = cleanSkill(raw);
    if (alias && !byAlias.has(alias)) byAlias.set(alias, tidySkill(raw));
  }
  const found = await lookup(db, [...byAlias.keys()]);
  const unseen = [...byAlias].filter(([alias]) => !found.has(alias));

  if (unseen.length) {
    const { results } = await db.prepare(`SELECT name FROM skills ORDER BY id`).all<{ name: string }>();
    const known = knownSkills([...results.map((r) => r.name), ...RECORD.skills.map((s) => s.name)]);
    const stmts = unseen.flatMap(([alias, display]) => {
      const name = matchSkill(display, known) ?? display;
      known.set(name.toLowerCase(), name);
      return [
        db.prepare(`INSERT INTO skills (name) VALUES (?) ON CONFLICT (name) DO NOTHING`).bind(name),
        db.prepare(`INSERT INTO skill_aliases (alias, skill_id, source) SELECT ?, id, 'code' FROM skills WHERE name = ? ON CONFLICT (alias) DO NOTHING`).bind(alias, name),
      ];
    });
    await db.batch(stmts);
    for (const [alias, ref] of await lookup(db, unseen.map(([alias]) => alias))) found.set(alias, ref);
  }

  const out = new Map<string, SkillRef>();
  for (const raw of rawNames) {
    const ref = found.get(cleanSkill(raw));
    if (ref) out.set(raw, ref);
  }
  return out;
}
