// The resume.yaml bridge: answers that confirm a skill ("I have this", or the skill named in "Something close") go into
// data/resume.yaml by one pull request per batch. Merging it rebuilds the site; the PR is Ryan's review step.
// GitHub calls use GITHUB_REPO_TOKEN, a fine-grained token limited to rjrjensen/whoami (contents and pull requests: write).
import { applyAdditions, type Addition, type Outcome } from "#lib/resume-edit.ts";
import type { EvidenceKind, SkillResponse } from "./questions";

export const REPO = "rjrjensen/whoami";
export const PATH = "data/resume.yaml";
/** CI regenerates the downloads on branches with this prefix (.github/workflows/resume-answers.yml). */
export const BRANCH_PREFIX = "resume-answers/";

export type Pending = SkillResponse & { resume_pr: number | null };

/** Answers waiting for resume.yaml: not yet in a PR first, then by PR, oldest first. */
export async function pending(db: D1Database): Promise<Pending[]> {
  const { results } = await db
    .prepare(`SELECT * FROM skill_responses WHERE resume_status = 'todo' ORDER BY resume_pr IS NOT NULL, resume_pr, answered_at, skill`)
    .all<Pending>();
  return results;
}

/** What goes on the resume for an answer: the skill itself, or for "close" the skill Ryan has instead. */
export const resumeName = (r: Pick<SkillResponse, "answer" | "skill" | "close_to">) => (r.answer === "close" ? (r.close_to ?? r.skill) : r.skill);

export type GitHub = {
  /** The file's text and blob sha on main, and main's commit sha. */
  readMain(): Promise<{ text: string; blobSha: string; headSha: string }>;
  /** Creates the branch at `fromSha`, commits the new text, and opens the PR. Returns its number and URL. */
  openPr(input: { branch: string; fromSha: string; blobSha: string; text: string; title: string; body: string }): Promise<{ number: number; url: string }>;
  /** Merged, closed without merging, or still open. */
  prState(number: number): Promise<"merged" | "closed" | "open">;
};

export type Chosen = { skillKey: string; name: string; group: string };
export type OpenResult = { ok: true; number: number; url: string; outcomes: Outcome[] } | { ok: false; error: string };

/** Applies the chosen answers to main's resume.yaml and opens one PR for them. Nothing is marked unless the PR opens. */
export async function openResumePr(db: D1Database, gh: GitHub, chosen: Chosen[], now = new Date()): Promise<OpenResult> {
  if (!chosen.length) return { ok: false, error: "Pick at least one answer to send." };
  const rows = new Map((await pending(db)).filter((r) => r.resume_pr === null).map((r) => [r.skill_key, r]));
  const picked = chosen.map((c) => ({ ...c, row: rows.get(c.skillKey) }));
  const stale = picked.find((p) => !p.row);
  if (stale) return { ok: false, error: "One of those answers changed or is already in a pull request. Reload and try again." };
  const blank = picked.find((p) => !p.name.trim() || !p.group);
  if (blank) return { ok: false, error: `Give ${blank.row!.skill} a name and a group.` };

  const main = await gh.readMain();
  const additions: Addition[] = picked.map((p) => ({
    skill: p.name,
    group: p.group,
    evidenceId: p.row!.answer === "have" && p.row!.evidence_kind === "job" ? p.row!.evidence_id : null,
  }));
  let edited: ReturnType<typeof applyAdditions>;
  try {
    edited = applyAdditions(main.text, additions);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (edited.yaml === main.text) {
    await markNotNeeded(db, picked.map((p) => p.skillKey));
    return { ok: false, error: "resume.yaml already has all of those, so there's nothing to change. They're marked as not needed." };
  }

  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const names = edited.outcomes.map((o) => o.skill);
  const pr = await gh.openPr({
    branch: `${BRANCH_PREFIX}${stamp}`,
    fromSha: main.headSha,
    blobSha: main.blobSha,
    text: edited.yaml,
    title: `Resume: add ${names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`}`,
    body: prBody(picked.map((p, i) => ({ row: p.row!, outcome: edited.outcomes[i] }))),
  });
  await db.batch(picked.map((p) => db.prepare(`UPDATE skill_responses SET resume_pr = ? WHERE skill_key = ?`).bind(pr.number, p.skillKey)));
  return { ok: true, ...pr, outcomes: edited.outcomes };
}

/** Checks each open PR once: merged marks its answers done, closed unmerged puts them back in the queue. */
export async function syncPrs(db: D1Database, gh: GitHub, rows: Pending[]): Promise<boolean> {
  const numbers = [...new Set(rows.map((r) => r.resume_pr).filter((n): n is number => n !== null))];
  const states = await Promise.all(numbers.map(async (n) => [n, await gh.prState(n)] as const));
  const changes = states.flatMap(([n, state]) =>
    state === "merged"
      ? [db.prepare(`UPDATE skill_responses SET resume_status = 'done' WHERE resume_pr = ? AND resume_status = 'todo'`).bind(n)]
      : state === "closed"
        ? [db.prepare(`UPDATE skill_responses SET resume_pr = NULL WHERE resume_pr = ? AND resume_status = 'todo'`).bind(n)]
        : [],
  );
  if (changes.length) await db.batch(changes);
  return changes.length > 0;
}

/** For answers Ryan decides shouldn't go on the resume, or that it already covers. */
export async function markNotNeeded(db: D1Database, skillKeys: string[]) {
  if (!skillKeys.length) return;
  await db.batch(
    skillKeys.map((k) => db.prepare(`UPDATE skill_responses SET resume_status = 'not_needed' WHERE skill_key = ? AND resume_status = 'todo' AND resume_pr IS NULL`).bind(k)),
  );
}

const EVIDENCE_WORDS: Record<EvidenceKind, string> = {
  job: "job",
  project: "project",
  education: "education",
  certificate: "certificate",
  testimonial: "testimonial",
  self_taught: "self-taught",
};

function prBody(items: { row: Pending; outcome: Outcome }[]) {
  const lines = items.map(({ row, outcome }) => {
    const why =
      row.answer === "close"
        ? `"Something close" to ${row.skill}`
        : `"I have this"${row.evidence_kind ? `, ${EVIDENCE_WORDS[row.evidence_kind]}${row.evidence_id ? ` \`${row.evidence_id}\`` : ""}` : ""}`;
    // No notes: the repo is public, notes are free text that can name a client, and API commits skip the private-data hook.
    return `- **${outcome.skill}**: ${outcome.changes.join("; ")}. From ${why}, answered ${row.answered_at.slice(0, 10)}.`;
  });
  return `## Summary

Skills Ryan confirmed in the admin app, added to \`${PATH}\`:

${lines.join("\n")}

The **resume-answers** workflow regenerates the downloads, the site content, and the Fit Check record on this branch. Merging marks these answers done in the admin app; closing without merging puts them back in its queue.

## Merge Danger

**Door:** two-way

**Blast Radius:** resume

Public: the skills show on ryanjensen.dev and in every download after merge. Check the wording and the group before merging.
`;
}

const b64 = {
  encode: (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join("")),
  decode: (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0))),
};

/** The GitHub REST client the bridge uses. */
export function githubRepo(token: string, fetcher: typeof fetch = fetch): GitHub {
  const api = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
    const res = await fetcher(`https://api.github.com/repos/${REPO}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ryanjensen-admin",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path} returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  };
  return {
    async readMain() {
      const [file, ref] = await Promise.all([
        api<{ content: string; sha: string }>(`/contents/${PATH}?ref=main`),
        api<{ object: { sha: string } }>(`/git/ref/heads/main`),
      ]);
      return { text: b64.decode(file.content), blobSha: file.sha, headSha: ref.object.sha };
    },
    async openPr({ branch, fromSha, blobSha, text, title, body }) {
      await api(`/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch}`, sha: fromSha } });
      await api(`/contents/${PATH}`, { method: "PUT", body: { message: title, content: b64.encode(text), sha: blobSha, branch } });
      const pr = await api<{ number: number; html_url: string }>(`/pulls`, { method: "POST", body: { title, head: branch, base: "main", body } });
      return { number: pr.number, url: pr.html_url };
    },
    async prState(number) {
      const pr = await api<{ state: "open" | "closed"; merged: boolean }>(`/pulls/${number}`);
      return pr.merged ? "merged" : pr.state;
    },
  };
}
