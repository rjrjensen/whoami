// Push to Ryan's phone (ntfy) when a check finds must-haves his record can't confirm. The same gaps are queued in
// D1 (skill_questions) for the admin app; this is the immediate heads-up.
import type { DaySummary } from "./db";
import type { FitReport } from "./report";

export async function notifyGaps(report: FitReport, opts: { server: string; topic: string; siteUrl: string }) {
  const gaps = report.items.filter((i) => i.status === "unconfirmed" && i.importance === "must");
  if (!gaps.length) return;
  const role = [report.role.title, report.role.company && `at ${report.role.company}`].filter(Boolean).join(" ");
  const res = await fetch(`${opts.server}/${opts.topic}`, {
    method: "POST",
    headers: {
      // Header values must be ASCII; the body carries everything else.
      Title: "Fit Check: unconfirmed must-haves",
      Tags: "mag",
      Click: `${opts.siteUrl}/fit-check?id=${report.id}`,
    },
    body: `${role || "A role"} scored ${report.score} (${report.label}).\nUnconfirmed: ${gaps.map((g) => g.skill).join(", ")}`,
  });
  if (!res.ok) console.warn(`ntfy returned ${res.status}`);
}

/** A plain heads-up, e.g. when enough postings are saved to start building evals. */
export async function notify(opts: { server: string; topic: string }, title: string, body: string, click?: string, tags = "bar_chart") {
  const res = await fetch(`${opts.server}/${opts.topic}`, {
    method: "POST",
    headers: { Title: title, Tags: tags, ...(click ? { Click: click } : {}) },
    body,
  });
  if (!res.ok) console.warn(`ntfy returned ${res.status}`);
}

/** Ryan's evening summary. Nothing is sent on a day with no checks. */
export async function notifyDay(day: DaySummary, opts: { server: string; topic: string; siteUrl: string }) {
  if (!day.checks && !day.questions.length) return;
  const best = day.best && [day.best.role_title, day.best.company && `at ${day.best.company}`].filter(Boolean).join(" ");
  const lines = [
    `${day.checks} new check${day.checks === 1 ? "" : "s"} today.`,
    day.best && `Best match: ${best || "a role"} scored ${day.best.score}.`,
    day.questions.length && `Skills to answer: ${day.questions.map((q) => `${q.skill}${q.importance === "must" ? " (must)" : ""} ×${q.times_asked}`).join(", ")}`,
  ];
  await notify(opts, "Fit Check: today's summary", lines.filter(Boolean).join("\n"), day.best ? `${opts.siteUrl}/fit-check?id=${day.best.id}` : undefined);
}
