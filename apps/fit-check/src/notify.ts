// Push to Ryan's phone (ntfy) when a check finds must-haves his record can't confirm. The same gaps are queued in
// D1 (skill_questions) for the admin app; this is the immediate heads-up.
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
