// Fit Check API (Cloudflare Worker). Pipeline and guardrails are described in docs/fit-check.md.
//   POST /fit-check { jobDescription, turnstileToken } → { report }
//   GET  /fit-check/<id>                               → { report }   (a saved report, for its link)
import { cachedReport, checksThisMonth, distinctPostings, getReport, lastDay, purgeOldJobDescriptions, reachMilestone, saveCheck, skillAnswers } from "./db";
import { ExtractionFailed, extractRequirements, NotAJobDescription } from "./extract";
import { corsHeaders, normalizeJobDescription, sha256, verifyTurnstile } from "./guard";
import { ClaudeMatcher, JevMatcher, matchWithFallback } from "./match";
import { notify, notifyDay, notifyGaps } from "./notify";
import { buildReport, type FitReport } from "./report";

export interface Env {
  DB: D1Database;
  LIMITER: RateLimit;
  ALLOWED_ORIGINS: string;
  MONTHLY_CAP: string;
  ANTHROPIC_API_KEY: string;
  JEV_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  IP_HASH_SALT: string;
  /** Local development only: skip Turnstile when no secret is set. */
  ALLOW_NO_TURNSTILE?: string;
  SITE_URL: string;
  NTFY_SERVER: string;
  /** Secret: an unguessable ntfy topic name. No push notifications when unset. */
  NTFY_TOPIC?: string;
}

const MIN_CHARS = 200;
const MAX_CHARS = 15_000;
/** Distinct postings needed before labeling them for evals is worthwhile. */
const EVAL_POSTINGS = 20;
/** Must match the evening trigger in wrangler.jsonc. */
const DIGEST_CRON = "0 23 * * *";

type ErrorCode = "invalid_request" | "too_short" | "too_long" | "turnstile_failed" | "rate_limited" | "not_a_job_description" | "not_found" | "resting" | "upstream";

const MESSAGES: Record<ErrorCode, string> = {
  invalid_request: "That request didn't look right. Try again?",
  too_short: `Paste the full job description (at least ${MIN_CHARS} characters).`,
  too_long: `That's longer than ${MAX_CHARS.toLocaleString("en-US")} characters. Trim the company and benefits sections and try again.`,
  turnstile_failed: "The bot check didn't pass. Reload the page and try again.",
  rate_limited: "That's a lot of checks in a minute. Wait a moment and try again.",
  not_a_job_description: "That doesn't look like a job description. Paste the posting's text, including its requirements.",
  not_found: "I couldn't find that report. Run a new check below.",
  resting: "Fit Check has hit its limit for the month. Email me the job description and I'll reply myself.",
  upstream: "Something went wrong on my end. Try again in a minute, or email me the job description.",
};

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  too_short: 400,
  too_long: 413,
  turnstile_failed: 403,
  rate_limited: 429,
  not_a_job_description: 422,
  not_found: 404,
  resting: 503,
  upstream: 502,
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const cors = corsHeaders(request.headers.get("Origin"), env.ALLOWED_ORIGINS);
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
    const fail = (code: ErrorCode) => json({ error: code, message: MESSAGES[code] }, STATUS[code]);

    const { pathname } = new URL(request.url);
    const saved = pathname.match(/^\/fit-check\/([0-9a-f-]{36})$/);
    if (pathname !== "/fit-check" && !saved) return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const allowed = saved ? "GET" : "POST";
    if (request.method !== allowed) return new Response("Method not allowed", { status: 405, headers: { ...cors, Allow: `${allowed}, OPTIONS` } });

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!(await env.LIMITER.limit({ key: ip })).success) return fail("rate_limited");

    if (saved) {
      const report = await getReport(env.DB, saved[1]);
      return report ? json({ report }) : fail("not_found");
    }

    let body: { jobDescription?: unknown; turnstileToken?: unknown };
    try {
      body = await request.json();
    } catch {
      return fail("invalid_request");
    }
    if (typeof body.jobDescription !== "string") return fail("invalid_request");
    const jd = normalizeJobDescription(body.jobDescription);
    if (jd.length < MIN_CHARS) return fail("too_short");
    if (jd.length > MAX_CHARS) return fail("too_long");

    if (env.TURNSTILE_SECRET_KEY) {
      if (typeof body.turnstileToken !== "string" || !(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, body.turnstileToken, ip))) return fail("turnstile_failed");
    } else if (env.ALLOW_NO_TURNSTILE !== "1") {
      console.error("TURNSTILE_SECRET_KEY is not set");
      return fail("upstream");
    }

    const [jdHash, ipHash] = await Promise.all([sha256(jd.toLowerCase()), sha256(`${env.IP_HASH_SALT}:${ip}`)]);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const hit = await cachedReport(env.DB, jdHash);
    if (hit) {
      const report: FitReport = { ...hit, id, createdAt, cached: true };
      // Saved before responding, so the report's link works the moment it's shown.
      await saveCheck(env.DB, { report, jdHash, jdText: body.jobDescription, ipHash, extractor: null, usage: null });
      return json({ report });
    }

    if ((await checksThisMonth(env.DB)) >= Number(env.MONTHLY_CAP)) return fail("resting");

    try {
      const { extraction, model, usage } = await extractRequirements(env.ANTHROPIC_API_KEY, jd);
      const [{ matches, matcher }, answers] = await Promise.all([
        matchWithFallback(env.JEV_API_KEY ? new JevMatcher(env.JEV_API_KEY) : null, new ClaudeMatcher(env.ANTHROPIC_API_KEY), extraction.requirements, jd),
        skillAnswers(env.DB, extraction.requirements.map((r) => r.skill)),
      ]);
      const report = buildReport(extraction, matches, answers, { id, createdAt, matcher });
      await saveCheck(env.DB, { report, jdHash, jdText: body.jobDescription, ipHash, extractor: model, usage });
      if (env.NTFY_TOPIC) ctx.waitUntil(notifyGaps(report, { server: env.NTFY_SERVER, topic: env.NTFY_TOPIC, siteUrl: env.SITE_URL }).catch((err) => console.warn("ntfy failed:", err)));
      return json({ report });
    } catch (err) {
      if (err instanceof NotAJobDescription) return fail("not_a_job_description");
      console.error(err instanceof ExtractionFailed ? `Extraction failed: ${err.message}` : err);
      return fail("upstream");
    }
  },

  async scheduled(controller, env) {
    if (controller.cron === DIGEST_CRON) {
      if (env.NTFY_TOPIC) await notifyDay(await lastDay(env.DB), { server: env.NTFY_SERVER, topic: env.NTFY_TOPIC, siteUrl: env.SITE_URL });
      return;
    }
    await purgeOldJobDescriptions(env.DB);
    // Once there are enough real postings to label, it's time to build evals (docs/fit-check-flow.md#tuning).
    if (env.NTFY_TOPIC && (await distinctPostings(env.DB)) >= EVAL_POSTINGS && (await reachMilestone(env.DB, `postings-${EVAL_POSTINGS}`)))
      await notify(
        { server: env.NTFY_SERVER, topic: env.NTFY_TOPIC },
        `Fit Check: ${EVAL_POSTINGS} postings saved`,
        `${EVAL_POSTINGS} different job descriptions have been checked. Time to label them and start evaluating.`,
        "https://github.com/rjrjensen/whoami/blob/main/docs/fit-check-flow.md#tuning",
      );
  },
} satisfies ExportedHandler<Env>;
