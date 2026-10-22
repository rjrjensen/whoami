// PostHog analytics. Event names are documented in README.md → Analytics.
// Components stay server-rendered: they mark elements with data-* attributes and the delegated
// listeners below turn those into events.
import type { PostHog } from "posthog-js";
import { POSTHOG_HOSTS, POSTHOG_KEY, POSTHOG_MODE, POSTHOG_PROXY_PATH } from "@/lib/analytics-config";

const SCROLL_MILESTONES = [25, 50, 75, 100];

function analyticsAllowed(): boolean {
  if (!POSTHOG_KEY) return false;
  const local = process.env.NODE_ENV !== "production" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (local && process.env.NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL !== "1") return false;
  // Honor Do Not Track and Global Privacy Control. posthog-js's respect_dnt doesn't stop cookieless capture.
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack !== "1" && nav.globalPrivacyControl !== true;
}

/**
 * `?ref=<source>` (e.g. ?ref=linkedin, ?ref=acme) tags every event from this page load with `ref`, so a visit
 * can be tied to the profile or the person the link was handed to. Kept in memory only, like everything else.
 */
function tagReferral(posthog: PostHog) {
  const ref = new URLSearchParams(location.search).get("ref")?.trim().toLowerCase().slice(0, 64);
  if (ref) posthog.register({ ref });
}

function trackClicks(posthog: PostHog) {
  document.addEventListener(
    "click",
    (event) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>("a[href], [data-track]");
      if (!el) return;

      const track = el.dataset.track;
      if (track === "resume_download") {
        posthog.capture("resume_download", { variant: el.dataset.variant, format: el.dataset.format });
        return;
      }
      if (track === "version_switch") {
        posthog.capture("version_switch", { from_variant: el.dataset.from, to_variant: el.dataset.to });
        return;
      }
      if (track === "page_turn") {
        posthog.capture("page_turn", {
          from_page: el.dataset.from,
          to_page: el.dataset.to,
          direction: el.dataset.direction,
          method: el.dataset.method ?? "click",
        });
        return;
      }
      if (track === "fit_check_submit") {
        posthog.capture("fit_check_submit");
        return;
      }
      if (track === "fit_check_nudge") {
        posthog.capture("fit_check_nudge");
        return;
      }

      if (!(el instanceof HTMLAnchorElement)) return;
      if (el.protocol === "mailto:") {
        posthog.capture("contact_email_click");
      } else if (el.protocol.startsWith("http") && el.host !== location.host) {
        posthog.capture("outbound_link_click", { host: el.host, url: el.href });
      }
    },
    { capture: true },
  );
}

function trackSkillPopovers(posthog: PostHog) {
  // toggle doesn't bubble, so listen in the capture phase.
  document.addEventListener(
    "toggle",
    (event) => {
      const el = event.target as HTMLElement;
      if ((event as ToggleEvent).newState === "open" && el.dataset.skill) {
        posthog.capture("skill_popover_open", { skill: el.dataset.skill, skill_group: el.dataset.skillGroup });
      }
    },
    { capture: true },
  );
}

// The Fit Check component dispatches these; the pasted job description itself is never sent to analytics.
function trackFitCheck(posthog: PostHog) {
  document.addEventListener("fitcheck:result", (event) => posthog.capture("fit_check_result", (event as CustomEvent).detail));
  document.addEventListener("fitcheck:error", (event) => posthog.capture("fit_check_error", (event as CustomEvent).detail));
}

function trackScrollDepth(posthog: PostHog) {
  let path = location.pathname;
  let reached = new Set<number>();
  let pending = false;

  const measure = () => {
    pending = false;
    if (location.pathname !== path) {
      path = location.pathname;
      reached = new Set();
    }
    const doc = document.documentElement;
    const depth = doc.scrollHeight <= innerHeight ? 100 : ((scrollY + innerHeight) / doc.scrollHeight) * 100;
    for (const milestone of SCROLL_MILESTONES) {
      // 1% slack so the last milestone fires despite sub-pixel rounding.
      if (depth >= milestone - 1 && !reached.has(milestone)) {
        reached.add(milestone);
        posthog.capture("scroll_depth", { percent: milestone });
      }
    }
  };

  addEventListener(
    "scroll",
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(measure);
      }
    },
    { passive: true },
  );
}

if (analyticsAllowed()) {
  // Loaded on demand so visitors who aren't tracked never download the SDK.
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_PROXY_PATH,
        ui_host: POSTHOG_HOSTS.ui,
        defaults: "2026-05-30", // includes capture_pageview: "history_change" for client-side navigations
        ...(POSTHOG_MODE === "cookieless"
          ? { cookieless_mode: "always" as const, disable_session_recording: true }
          : { persistence: "memory" as const }),
        person_profiles: "identified_only",
        // Clicks only (no form changes or submits), for click stats, heatmaps, rage clicks, and dead clicks.
        autocapture: { dom_event_allowlist: ["click"] },
        capture_heatmaps: true,
        capture_dead_clicks: true,
        session_recording: { maskAllInputs: true },
        disable_surveys: true,
        disable_conversations: true,
        disable_product_tours: true,
      });
      tagReferral(posthog);
      trackClicks(posthog);
      trackSkillPopovers(posthog);
      trackFitCheck(posthog);
      trackScrollDepth(posthog);
    })
    .catch(() => {
      // Analytics must never break the page.
    });
}
