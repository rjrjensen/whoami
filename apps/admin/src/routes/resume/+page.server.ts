// The resume.yaml bridge: confirmed skills waiting to go into data/resume.yaml, sent as one pull request per batch.
import { env } from "cloudflare:workers";
import { fail } from "@sveltejs/kit";
import { RECORD } from "@ryanjensen/fit-check/record";
import { requireAdmin } from "#lib/server/auth.ts";
import { EVIDENCE } from "#lib/server/questions.ts";
import { githubRepo, markNotNeeded, openResumePr, pending, resumeName, syncPrs, type Chosen } from "#lib/server/resume-pr.ts";
import type { Actions, PageServerLoad } from "./$types";

/** The groups under `skills:` as of this build. The PR re-checks them against main's resume.yaml. */
const GROUPS = [...new Set(RECORD.skills.map((s) => s.group))];
const evidenceTitle = new Map(EVIDENCE.map((e) => [e.id, e.title]));

const gh = () => (env.GITHUB_REPO_TOKEN ? githubRepo(env.GITHUB_REPO_TOKEN) : null);

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const github = gh();
  let rows = await pending(env.DB);
  let syncError: string | null = null;
  if (github && rows.some((r) => r.resume_pr !== null)) {
    try {
      if (await syncPrs(env.DB, github, rows)) rows = await pending(env.DB);
    } catch (e) {
      console.error("resume PR sync failed", e);
      syncError = "Couldn't check the open pull requests on GitHub. Their status may be out of date.";
    }
  }
  return {
    connected: !!github,
    syncError,
    groups: GROUPS,
    rows: rows.map((r) => ({
      ...r,
      name: resumeName(r),
      evidence: r.evidence_id ? (evidenceTitle.get(r.evidence_id) ?? r.evidence_id) : r.evidence_kind === "self_taught" ? "Self-taught" : r.evidence_kind === "testimonial" ? "A testimonial" : null,
    })),
  };
};

export const actions: Actions = {
  // Each row's fields are named by its skill key: send-<key>, name-<key>, group-<key>.
  send: async (event) => {
    requireAdmin(event);
    const github = gh();
    if (!github) return fail(503, { error: "GITHUB_REPO_TOKEN isn't set on the admin Worker yet." });
    const form = await event.request.formData();
    const chosen: Chosen[] = form.getAll("send").map((k) => {
      const key = String(k);
      return { skillKey: key, name: String(form.get(`name-${key}`) ?? "").slice(0, 120), group: String(form.get(`group-${key}`) ?? "") };
    });
    try {
      const result = await openResumePr(env.DB, github, chosen);
      return result.ok ? { opened: { number: result.number, url: result.url, outcomes: result.outcomes } } : fail(400, { error: result.error });
    } catch (e) {
      console.error("opening the resume PR failed", e);
      return fail(502, { error: "GitHub didn't accept the pull request. Check the token's permissions and try again." });
    }
  },
  skip: async (event) => {
    requireAdmin(event);
    const form = await event.request.formData();
    await markNotNeeded(env.DB, [String(form.get("skill_key") ?? "")]);
    return { skipped: String(form.get("skill") ?? "That answer") };
  },
};
