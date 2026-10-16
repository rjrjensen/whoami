// PostHog settings shared by next.config.ts (the reverse proxy) and instrumentation-client.ts.
// No imports: next.config.ts loads this file directly.

/** Public client token (safe to commit). Set NEXT_PUBLIC_POSTHOG_KEY="" to turn analytics off. */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_pzj5hMZqjPgjGMrj3Mu3fDao4K45EdSBDQpWoTfxca3f";

/** Which PostHog cloud the project lives in. Must match the project, or events are rejected. */
export const POSTHOG_REGION: "us" | "eu" = "us";

/**
 * How visitors are identified. Neither mode sets cookies or writes browser storage, so no consent banner.
 * - "cookieless": PostHog hashes visitors server-side (accurate daily uniques). Session replay is unavailable;
 *   posthog-js refuses to record without a client session id.
 * - "memory": ids live in memory only, so session replay works within a tab, but every full page load counts
 *   as a new visitor.
 */
export const POSTHOG_MODE: "cookieless" | "memory" = "cookieless";

/** Same-origin path the browser sends events to, so ad blockers don't drop them. Avoid words like "analytics". */
export const POSTHOG_PROXY_PATH = "/rj-relay";

export const POSTHOG_HOSTS = {
  us: { api: "https://us.i.posthog.com", assets: "https://us-assets.i.posthog.com", ui: "https://us.posthog.com" },
  eu: { api: "https://eu.i.posthog.com", assets: "https://eu-assets.i.posthog.com", ui: "https://eu.posthog.com" },
}[POSTHOG_REGION];
