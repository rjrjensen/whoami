"use client";
// Fit Check: paste a job description, get a requirement-by-requirement report from the Fit Check API
// (apps/fit-check). Analytics come from data-track on the button and the fitcheck:* events dispatched below;
// the pasted text never goes to analytics.
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FitReport, ReportEvidence, ReportItem, Status } from "@ryanjensen/fit-check/report";
import { pageHref } from "@/lib/pages";
import { downloadHref, site, slug, VARIANTS, type VariantId } from "@/lib/resume";

const API_URL = process.env.NEXT_PUBLIC_FIT_CHECK_URL ?? "https://api.ryanjensen.dev/fit-check";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const MIN_CHARS = 200;
const MAX_CHARS = 15_000;

const STATUS: Record<Status, { icon: string; label: string; className: string }> = {
  demonstrated: { icon: "✓", label: "Demonstrated", className: "bg-accent-soft text-accent" },
  transferable: { icon: "↻", label: "Likely transferable (inferred)", className: "bg-surface-2 text-ink" },
  learning: { icon: "↑", label: "Learning", className: "bg-surface-2 text-ink" },
  unconfirmed: { icon: "?", label: "Not yet confirmed", className: "bg-surface-2 text-muted" },
  not_focus: { icon: "–", label: "Not a focus", className: "bg-surface-2 text-muted" },
};
const ORDER: Status[] = ["demonstrated", "transferable", "learning", "unconfirmed", "not_focus"];

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** Loads Turnstile on first interaction, so visitors who never use Fit Check don't download it. */
function useTurnstile(container: React.RefObject<HTMLDivElement | null>) {
  const widget = useRef<string | null>(null);
  const pending = useRef<((token: string | null) => void) | null>(null);
  const loading = useRef<Promise<void> | null>(null);

  const load = () => {
    if (!SITE_KEY || loading.current) return loading.current;
    loading.current = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => {
        widget.current = window.turnstile!.render(container.current!, {
          sitekey: SITE_KEY,
          execution: "execute",
          appearance: "interaction-only",
          size: "flexible",
          callback: (token: string) => pending.current?.(token),
          "error-callback": () => pending.current?.(null),
          "expired-callback": () => widget.current && window.turnstile?.reset(widget.current),
        });
        resolve();
      };
      s.onerror = () => reject(new Error("Turnstile failed to load"));
      document.head.append(s);
    });
    return loading.current;
  };

  const token = async (): Promise<string | null> => {
    if (!SITE_KEY) return null;
    await load();
    const id = widget.current!;
    return new Promise((resolve) => {
      pending.current = (t) => {
        pending.current = null;
        resolve(t);
      };
      window.turnstile!.reset(id);
      window.turnstile!.execute(id);
    });
  };

  return { load, token };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The job description box. Runs the check, then opens the report at /fit-check?id=…, which is also the link to
 * come back to it later. `compact` is the Home page version.
 */
export function FitCheckForm({ variant, compact = false }: { variant: VariantId; compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [state, setState] = useState<{ phase: "idle" | "checking" } | { phase: "error"; code: string; message: string }>({ phase: "idle" });
  const turnstileBox = useRef<HTMLDivElement>(null);
  const turnstile = useTurnstile(turnstileBox);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase === "checking") return;
    setState({ phase: "checking" });
    try {
      const turnstileToken = await turnstile.token();
      if (SITE_KEY && !turnstileToken) throw new FitCheckError("turnstile_failed", "The bot check didn't pass. Reload the page and try again.");
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: text, turnstileToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.report || !UUID.test(body.report.id)) throw new FitCheckError(body.error ?? "upstream", body.message);
      const report = body.report as FitReport;
      document.dispatchEvent(
        new CustomEvent("fitcheck:result", {
          detail: { score: report.score, label: report.label, requirements: report.items.length, matcher: report.matcher, cached: report.cached, recommended: report.recommendedVersion },
        }),
      );
      router.push(`/fit-check?id=${report.id}&from=${variant}`);
      // On /fit-check itself the form stays mounted, so it has to leave "Checking…" on its own.
      setState({ phase: "idle" });
    } catch (err) {
      const e = err instanceof FitCheckError ? err : new FitCheckError("network");
      setState({ phase: "error", code: e.code, message: e.message });
      document.dispatchEvent(new CustomEvent("fitcheck:error", { detail: { error: e.code } }));
    }
  };

  const tooShort = text.trim().length < MIN_CHARS;
  const suffix = compact ? "" : "-full";
  const ids = { jd: `fit-check-jd${suffix}`, count: `fit-check-count${suffix}`, privacy: `fit-check-privacy${suffix}`, nudgeTip: `fit-check-nudge-tip${suffix}` };

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <label htmlFor={ids.jd} className="font-medium">
        Job description
      </label>
      <textarea
        id={ids.jd}
        name="jobDescription"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => turnstile.load()?.catch(() => {})}
        required
        minLength={MIN_CHARS}
        maxLength={MAX_CHARS}
        rows={compact ? 4 : 10}
        aria-describedby={`${ids.count} ${ids.privacy}`}
        placeholder="Paste the full posting, including the requirements and qualifications."
        className="mt-2 block w-full resize-y rounded-2xl border border-line bg-surface p-4 text-base leading-relaxed placeholder:text-muted focus:border-accent"
      />
      <div ref={turnstileBox} className="mt-3 empty:hidden" />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          data-track="fit_check_submit"
          disabled={tooShort || state.phase === "checking"}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-ink transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.phase === "checking" ? "Checking…" : "Check fit"}
        </button>
        {state.phase === "error" && state.code === "out_of_credits" && <NudgeButton tipId={ids.nudgeTip} />}
        <p id={ids.count} className="text-sm text-muted">
          {text.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")} characters
          {tooShort && ` (at least ${MIN_CHARS} needed)`}
        </p>
      </div>
      <p id={ids.privacy} className="mt-3 text-sm text-muted">
        What you paste is saved so I can read it and improve Fit Check. Please leave out anything confidential.
      </p>
      <div role="status" aria-live="polite" className="mt-4">
        {state.phase === "checking" && <p className="text-muted">Reading the requirements and checking them against my record. This takes a few seconds.</p>}
        {state.phase === "error" && <p className="rounded-2xl border border-signal/50 bg-surface p-4">{state.message}</p>}
      </div>
    </form>
  );
}

/**
 * Shown only after a check fails with out_of_credits: pings Ryan's phone through the API (at most once an hour,
 * however many visitors click). The tooltip shows on hover and keyboard focus, and Escape hides it.
 */
function NudgeButton({ tipId }: { tipId: string }) {
  const [phase, setPhase] = useState<"ready" | "sending" | "sent" | "failed">("ready");
  const [tipDismissed, setTipDismissed] = useState(false);

  const send = async () => {
    setPhase("sending");
    try {
      const res = await fetch(`${API_URL}/nudge`, { method: "POST" });
      setPhase(res.ok ? "sent" : "failed");
    } catch {
      setPhase("failed");
    }
  };

  return (
    <span className="relative inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="group relative inline-flex" onMouseLeave={() => setTipDismissed(false)} onBlur={() => setTipDismissed(false)}>
        <button
          type="button"
          data-track="fit_check_nudge"
          onClick={send}
          onKeyDown={(e) => e.key === "Escape" && setTipDismissed(true)}
          disabled={phase === "sending" || phase === "sent"}
          aria-describedby={tipId}
          className="inline-flex min-h-12 items-center rounded-full border border-line bg-bg px-6 font-medium transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "sent" ? "Nudged, thanks!" : phase === "sending" ? "Nudging…" : "Nudge"}
        </button>
        <span
          id={tipId}
          role="tooltip"
          className={`absolute bottom-full right-0 z-10 mb-2 w-max max-w-56 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg ${
            tipDismissed || phase === "sent" ? "hidden" : "hidden group-hover:block group-focus-within:block"
          }`}
        >
          Tell Ryan he needs more Claude credits!
        </span>
      </span>
      <span role="status" aria-live="polite" className="text-sm">
        {phase === "sent" && <span className="sr-only">Nudged, thanks! Ryan will get a heads-up.</span>}
        {phase === "failed" && "That didn't go through. Email me instead?"}
      </span>
    </span>
  );
}

/** The report at /fit-check?id=…&from=…, loaded from the API so the link works later too. */
export function FitCheckReport() {
  const [state, setState] = useState<{ phase: "none" | "loading" } | { phase: "error"; message: string } | { phase: "done"; report: FitReport; variant: VariantId }>({
    phase: "loading",
  });
  const heading = useRef<HTMLHeadingElement>(null);
  // From the hook, not location.search, so a check run from this page's own form loads its new report.
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const from = params.get("from");

  useEffect(() => {
    const variant = VARIANTS.some((v) => v.id === from) ? (from as VariantId) : "base";
    if (!UUID.test(id)) {
      // Nothing to load: the page shows the form on its own. Deferred so it's not a synchronous update in the effect.
      queueMicrotask(() => setState({ phase: "none" }));
      return;
    }
    queueMicrotask(() => setState({ phase: "loading" }));
    fetch(`${API_URL}/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.report) throw new FitCheckError(body.error ?? "upstream", body.message);
        setState({ phase: "done", report: body.report, variant });
      })
      .catch((err) => setState({ phase: "error", message: (err instanceof FitCheckError ? err : new FitCheckError("network")).message }));
  }, [id, from]);

  useEffect(() => {
    if (state.phase === "done") heading.current?.focus();
  }, [state.phase]);

  return (
    <>
      <div role="status" aria-live="polite">
        {state.phase === "loading" && <p className="text-muted">Loading the report…</p>}
        {state.phase === "error" && <p className="rounded-2xl border border-signal/50 bg-surface p-4">{state.message}</p>}
      </div>
      {state.phase === "done" && <Report report={state.report} variant={state.variant} headingRef={heading} />}
    </>
  );
}

class FitCheckError extends Error {
  constructor(
    readonly code: string,
    message = "Something went wrong. Try again in a minute, or email me the job description.",
  ) {
    super(message);
  }
}

function Report({ report, variant, headingRef }: { report: FitReport; variant: VariantId; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const recommended = VARIANTS.find((v) => v.id === report.recommendedVersion)!;
  const d = site.variants[recommended.id].downloads;
  const pdf = d.formats.some((f) => f.ext === "pdf") ? "pdf" : "docx";
  const { email } = site.variants[variant].basics;
  const role = [report.role.title, report.role.company && `at ${report.role.company}`].filter(Boolean).join(" ");
  const groups = ORDER.map((s) => [s, report.items.filter((i) => i.status === s)] as const).filter(([, items]) => items.length);

  return (
    <article aria-labelledby="fit-report-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Fit report</p>
      <h2 id="fit-report-title" ref={headingRef} tabIndex={-1} className="mt-2 font-display text-3xl sm:text-4xl">
        {role || "Your role"}
      </h2>

      <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="font-display text-7xl leading-none text-accent">
          {report.score}
          <span className="text-2xl text-muted">/100</span>
        </p>
        <p className="pb-1 text-xl font-medium">{report.label}</p>
      </div>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed">{report.explanation}</p>

      {report.strengths.length > 0 && (
        <section aria-labelledby="fit-strengths" className="mt-10">
          <h3 id="fit-strengths" className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
            Strengths for this role
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="rounded-2xl border border-line bg-bg p-4">
                <p className="font-medium">{s.requirement}</p>
                <Evidence items={s.evidence} variant={variant} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="fit-checklist" className="mt-10">
        <h3 id="fit-checklist" className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
          Every requirement
        </h3>
        {groups.map(([status, items]) => (
          <section key={status} aria-label={STATUS[status].label} className="mt-5">
            <h4 className="flex items-center gap-2 font-semibold">
              <StatusIcon status={status} />
              {STATUS[status].label} <span className="font-normal text-muted">({items.length})</span>
            </h4>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {items.map((item, i) => (
                <Item key={i} item={item} variant={variant} />
              ))}
            </ul>
          </section>
        ))}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={downloadHref(recommended.id, d.file, pdf)}
          download
          data-track="resume_download"
          data-variant={recommended.id}
          data-format={pdf}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
        >
          Download the {recommended.label} resume ({pdf.toUpperCase()})
        </a>
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(`Opportunity for Ryan${role ? `: ${role}` : ""}`)}`}
          className="inline-flex min-h-12 items-center rounded-full border border-line bg-bg px-6 font-medium transition-colors hover:bg-surface-2"
        >
          Email me about this role
        </a>
      </div>
      <p className="mt-6 text-sm text-muted">
        Requirements are read by Claude and matched against my record by {report.matcher === "jev" ? "TypeSafe Jev" : "Claude"}. Anything I
        haven&rsquo;t confirmed gets flagged for me to answer, so the next check knows.
      </p>
    </article>
  );
}

function Item({ item, variant }: { item: ReportItem; variant: VariantId }) {
  return (
    <li className="py-3">
      <p>
        {item.requirement}{" "}
        <span className="ml-1 whitespace-nowrap rounded-full border border-line px-2 py-0.5 align-middle text-xs text-muted">
          {item.importance === "must" ? "Must-have" : "Nice-to-have"}
        </span>
      </p>
      {item.reason && <p className="mt-1 text-sm text-muted">{item.reason}</p>}
      <Evidence items={item.evidence} variant={variant} />
    </li>
  );
}

function StatusIcon({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span aria-hidden="true" className={`inline-flex size-6 items-center justify-center rounded-full text-sm font-semibold ${s.className}`}>
      {s.icon}
    </span>
  );
}

// Links stay on the version being viewed when it shows that job; otherwise they go to the Complete version.
function evidenceHref(e: ReportEvidence, variant: VariantId) {
  if (e.kind === "job") {
    // Shorter versions leave some jobs out; those link to the Complete version's Experience page.
    const shown = site.variants[variant].work.some((w) => `job-${slug(w.name)}` === e.id);
    return `${pageHref(shown ? variant : "base", "experience")}#${e.id}`;
  }
  if (e.kind === "education" || e.kind === "certificate") return `${pageHref(variant, "skills")}#education`;
  if (e.kind === "project") return pageHref(variant, "about");
  return null;
}

function Evidence({ items, variant }: { items: ReportEvidence[]; variant: VariantId }) {
  const linked = items.filter((e) => evidenceHref(e, variant));
  if (!linked.length) return null;
  return (
    <p className="mt-1 text-sm">
      <span className="text-muted">See: </span>
      {linked.map((e, i) => (
        <span key={e.id}>
          {i > 0 && ", "}
          <a href={evidenceHref(e, variant)!} className="text-accent underline-offset-4 hover:underline">
            {e.title}
          </a>
        </span>
      ))}
    </p>
  );
}
