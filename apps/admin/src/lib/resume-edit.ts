// Edits data/resume.yaml for confirmed skill answers. Re-serializing would restyle the whole file (yaml can't reproduce its
// mix of `{ a }` maps and `[a]` lists), so this inserts text at the positions the parser reports and leaves every other byte alone.
// Pure, so the edit is tested without GitHub; resume-pr.ts fetches the file and opens the pull request.
import { isMap, isScalar, isSeq, parse, parseDocument, type YAMLMap, type YAMLSeq } from "yaml";

export type Addition = {
  /** The skill's name as it should read on the resume. */
  skill: string;
  /** A group under `skills:`, e.g. "Languages". */
  group: string;
  /** Record ids of jobs, like "job-hy-vee-inc": the skill is also added to each one's `technologies`. */
  jobIds: string[];
};

export type Outcome = { skill: string; changes: string[] };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const same = (a: unknown, b: string) => String(a).trim().toLowerCase() === b.trim().toLowerCase();
const tidy = (s: string) => s.trim().replace(/\s+/g, " ");

/** A YAML scalar for a name: plain when that reads back as the same string, double-quoted otherwise (e.g. "C#"). */
export function scalar(name: string): string {
  const plain = !/[#:,[\]{}&*!|>'"%@`]/.test(name) && !/^[-?\s]|\s$/.test(name);
  if (plain) {
    try {
      if (parse(`[${name}]`)?.[0] === name) return name;
    } catch {
      // falls through to quoting
    }
  }
  return JSON.stringify(name);
}

/** The group names under `skills:`, in order. */
export function skillGroups(yamlText: string): string[] {
  const groups = parseDocument(yamlText).get("skills");
  return isSeq(groups) ? groups.items.filter(isMap).map((g) => String(g.get("name"))) : [];
}

/**
 * Applies each addition in turn: the skill goes into its group's `keywords` unless any group already lists it, and into each
 * evidence job's `technologies` unless that list already names it. Throws on an unknown group or job, so nothing half-applies.
 */
export function applyAdditions(yamlText: string, additions: Addition[]): { yaml: string; outcomes: Outcome[] } {
  let text = yamlText;
  const outcomes = additions.map((a) => {
    const name = tidy(a.skill);
    const changes: string[] = [];
    const step = (edit: (doc: ReturnType<typeof parseDocument>) => string | null) => {
      const doc = parseDocument(text);
      if (doc.errors.length) throw new Error(`resume.yaml doesn't parse: ${doc.errors[0].message}`);
      const next = edit(doc);
      if (next !== null) text = next;
    };

    step((doc) => {
      const groups = doc.get("skills") as YAMLSeq<YAMLMap>;
      const keywords = (g: YAMLMap) => g.get("keywords") as YAMLSeq<YAMLMap>;
      const target = groups.items.find((g) => same(g.get("name"), a.group));
      if (!target) throw new Error(`There's no "${a.group}" group under skills in resume.yaml.`);
      const listed = groups.items.find((g) => keywords(g).items.some((k) => same(k.get("name"), name)));
      if (listed) {
        changes.push(`already under ${listed.get("name")}`);
        return null;
      }
      changes.push(`added to ${target.get("name")}`);
      return appendBlockItem(text, keywords(target), `{ name: ${scalar(name)} }`);
    });

    for (const jobId of a.jobIds) {
      step((doc) => {
        const job = (doc.get("work") as YAMLSeq<YAMLMap>).items.find((w) => `job-${slug(String(w.get("name")))}` === jobId);
        if (!job) throw new Error(`There's no job "${jobId}" in resume.yaml.`);
        const where = `${job.get("name")}'s technologies`;
        const tech = job.get("technologies", true);
        if (isSeq(tech) && tech.items.some((t) => isScalar(t) && same(t.value, name))) {
          changes.push(`already in ${where}`);
          return null;
        }
        changes.push(`added to ${where}`);
        if (isSeq(tech) && tech.flow && tech.range) {
          const close = text.lastIndexOf("]", tech.range[1]);
          return text.slice(0, close) + (tech.items.length ? `, ${scalar(name)}` : scalar(name)) + text.slice(close);
        }
        if (tech) throw new Error(`${where} isn't a [list] in resume.yaml.`);
        return appendKey(text, job, `technologies: [${scalar(name)}]`);
      });
    }
    return { skill: name, changes };
  });
  return { yaml: text, outcomes };
}

/** Inserts `item` as a new `- item` line after a block list's last item, at the same indent. */
function appendBlockItem(text: string, seq: YAMLSeq, item: string) {
  const first = seq.items[0] as { range?: [number, number, number] } | undefined;
  const last = seq.items.at(-1) as { range?: [number, number, number] } | undefined;
  if (!first?.range || !last?.range || seq.flow) throw new Error("A skills group's keywords must be a non-empty - list.");
  const prefix = text.slice(text.lastIndexOf("\n", first.range[0]) + 1, first.range[0]); // e.g. "      - "
  return insertAfterLine(text, last.range[1], `${prefix}${item}`);
}

/** Inserts `line` as a new key at the end of a block map, at its keys' indent. */
function appendKey(text: string, map: YAMLMap, line: string) {
  const firstKey = map.items[0]?.key as { range?: [number, number, number] } | undefined;
  const lastValue = map.items.at(-1)?.value as { range?: [number, number, number] } | undefined;
  if (!firstKey?.range || !lastValue?.range) throw new Error("Can't find where that job ends in resume.yaml.");
  const indent = " ".repeat(firstKey.range[0] - (text.lastIndexOf("\n", firstKey.range[0]) + 1));
  return insertAfterLine(text, lastValue.range[1], `${indent}${line}`);
}

/** Inserts a line after the line that holds `offset` (or the line before it, when `offset` sits at a line start). */
function insertAfterLine(text: string, offset: number, line: string) {
  const end = text.indexOf("\n", Math.max(0, offset - 1));
  return end === -1 ? `${text}\n${line}` : `${text.slice(0, end)}\n${line}${text.slice(end)}`;
}
