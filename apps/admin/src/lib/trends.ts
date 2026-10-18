// Trends: which skills postings ask for, by month. Pure math; lib/server/trends.ts loads the rows.
// Each distinct posting (jd_hash) counts once, in the month it was first pasted, using that first report.
import type { FitReport, RoleType, Status } from "@ryanjensen/fit-check/report";
import type { SkillRef } from "#lib/server/skills.ts";

/** v1 reports have neither; the Jev pipeline adds them (docs/fit-check-flow.md, step 3). */
export type TrendReport = FitReport & { role: FitReport["role"] & { industry?: string | null; seniority?: string | number | null } };
export type Source = "visitor" | "ryan";
export type TrendRow = { jd_hash: string; created_at: string; source: Source; report: TrendReport };

export type SkillStatus = "have" | "close" | "learning" | "gap" | "not_pursuing";
export const STATUS_LABEL: Record<SkillStatus, string> = { have: "Have", close: "Close", learning: "Learning", gap: "Gap", not_pursuing: "Not pursuing" };

export type Filters = { industry?: string; roleType?: string; seniority?: string; source?: Source; month?: string };

/** How many months before the selected one make up the baseline for rising and falling. */
export const BASELINE_MONTHS = 3;

type Posting = { month: string; source: Source; roleType: RoleType; industry: string | null; seniority: string | null; skills: Map<number, "must" | "nice"> };

export type MonthCell = { must: number; nice: number };
export type SkillTrend = { id: number; name: string; status: SkillStatus; byMonth: Record<string, MonthCell>; total: number };
export type MonthRow = { id: number; name: string; status: SkillStatus; must: number; nice: number; share: number; mustShare: number; niceShare: number };
export type Change = { id: number; name: string; status: SkillStatus; share: number; baselineShare: number; delta: number };

export type TrendsView = {
  postings: number;
  months: string[];
  monthN: Record<string, number>;
  /** The month the snapshot and rising/falling are for; null when there are no postings. */
  month: string | null;
  snapshot: MonthRow[];
  skills: SkillTrend[];
  baseline: { months: string[]; n: number };
  rising: Change[];
  falling: Change[];
  gaps: MonthRow[];
  industries: { name: string; byMonth: Record<string, number> }[];
  options: { industries: string[]; roleTypes: RoleType[]; seniorities: string[]; sources: Source[]; months: string[] };
};

export const monthOf = (createdAt: string) => createdAt.slice(0, 7);

/** "2026-10" minus 3 → "2026-07". */
export function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const sorted = <T>(xs: Iterable<T>) => [...new Set(xs)].sort() as T[];

/** One entry per jd_hash: the earliest row wins. Skills are deduped per posting; must beats nice. */
export function distinctPostings(rows: TrendRow[], skillOf: Map<string, SkillRef>): Posting[] {
  const first = new Map<string, TrendRow>();
  for (const row of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) if (!first.has(row.jd_hash)) first.set(row.jd_hash, row);
  return [...first.values()].map((row) => {
    const skills = new Map<number, "must" | "nice">();
    for (const item of row.report.items) {
      const ref = skillOf.get(item.skill);
      if (ref && skills.get(ref.id) !== "must") skills.set(ref.id, item.importance);
    }
    const { industry, seniority, type } = row.report.role;
    return { month: monthOf(row.created_at), source: row.source, roleType: type, industry: industry ?? null, seniority: seniority == null ? null : String(seniority), skills };
  });
}

/** Ryan's status for a skill, most authoritative first: his full answer, the Worker's registry, the resume, then the latest report. */
export function pickStatus(s: { response?: string; answer?: string; onResume: boolean; latest?: Status }): SkillStatus {
  const fromResponse: Record<string, SkillStatus> = { have: "have", close: "close", learning: "learning", dont_have: "gap", not_pursuing: "not_pursuing" };
  const fromReport: Record<Status, SkillStatus> = { demonstrated: "have", transferable: "close", learning: "learning", unconfirmed: "gap", not_focus: "not_pursuing" };
  if (s.response && fromResponse[s.response]) return fromResponse[s.response];
  if (s.answer && fromResponse[s.answer]) return fromResponse[s.answer];
  if (s.onResume) return "have";
  return s.latest ? fromReport[s.latest] : "gap";
}

export function computeTrends(rows: TrendRow[], skillOf: Map<string, SkillRef>, statusOf: Map<number, SkillStatus>, filters: Filters = {}): TrendsView {
  const all = distinctPostings(rows, skillOf);
  const options = {
    industries: sorted(all.flatMap((p) => (p.industry ? [p.industry] : []))),
    roleTypes: sorted(all.map((p) => p.roleType)),
    seniorities: sorted(all.flatMap((p) => (p.seniority ? [p.seniority] : []))),
    sources: sorted(all.map((p) => p.source)),
    months: [] as string[],
  };
  const postings = all.filter(
    (p) =>
      (!filters.industry || p.industry === filters.industry) &&
      (!filters.roleType || p.roleType === filters.roleType) &&
      (!filters.seniority || p.seniority === filters.seniority) &&
      (!filters.source || p.source === filters.source),
  );
  const months = sorted(postings.map((p) => p.month));
  options.months = months;
  const monthN: Record<string, number> = {};
  for (const p of postings) monthN[p.month] = (monthN[p.month] ?? 0) + 1;

  const names = new Map([...skillOf.values()].map((r) => [r.id, r.name]));
  const status = (id: number) => statusOf.get(id) ?? "gap";

  // Counts per skill per month.
  const bySkill = new Map<number, Record<string, MonthCell>>();
  for (const p of postings)
    for (const [id, importance] of p.skills) {
      const byMonth = bySkill.get(id) ?? {};
      const cell = (byMonth[p.month] ??= { must: 0, nice: 0 });
      cell[importance]++;
      bySkill.set(id, byMonth);
    }
  const skills: SkillTrend[] = [...bySkill]
    .map(([id, byMonth]) => ({ id, name: names.get(id) ?? `#${id}`, status: status(id), byMonth, total: Object.values(byMonth).reduce((n, c) => n + c.must + c.nice, 0) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const month = filters.month && months.includes(filters.month) ? filters.month : (months.at(-1) ?? null);
  const n = month ? monthN[month] : 0;
  const snapshot: MonthRow[] = month
    ? skills
        .filter((s) => s.byMonth[month])
        .map((s) => {
          const { must, nice } = s.byMonth[month];
          return { id: s.id, name: s.name, status: s.status, must, nice, share: (must + nice) / n, mustShare: must / n, niceShare: nice / n };
        })
        .sort((a, b) => b.share - a.share || b.must - a.must || a.name.localeCompare(b.name))
    : [];

  // Rising and falling: this month's share against the pooled share over the previous months. Shown at any n, with n beside it.
  const baselineMonths = month ? Array.from({ length: BASELINE_MONTHS }, (_, i) => addMonths(month, i - BASELINE_MONTHS)) : [];
  const baselineN = baselineMonths.reduce((sum, m) => sum + (monthN[m] ?? 0), 0);
  const changes: Change[] =
    month && baselineN
      ? skills
          .map((s) => {
            const count = (m: string) => (s.byMonth[m] ? s.byMonth[m].must + s.byMonth[m].nice : 0);
            const share = count(month) / n;
            const baselineShare = baselineMonths.reduce((sum, m) => sum + count(m), 0) / baselineN;
            return { id: s.id, name: s.name, status: s.status, share, baselineShare, delta: share - baselineShare };
          })
          .filter((c) => c.share || c.baselineShare)
      : [];
  const byDelta = (a: Change, b: Change) => b.delta - a.delta || a.name.localeCompare(b.name);
  const rising = changes.filter((c) => c.delta > 0).sort(byDelta);
  const falling = changes.filter((c) => c.delta < 0).sort((a, b) => byDelta(b, a));

  const industryCounts = new Map<string, Record<string, number>>();
  for (const p of postings) {
    if (!p.industry) continue;
    const byMonth = industryCounts.get(p.industry) ?? {};
    byMonth[p.month] = (byMonth[p.month] ?? 0) + 1;
    industryCounts.set(p.industry, byMonth);
  }
  const industries = [...industryCounts].map(([name, byMonth]) => ({ name, byMonth })).sort((a, b) => a.name.localeCompare(b.name));

  return {
    postings: postings.length,
    months,
    monthN,
    month,
    snapshot,
    skills,
    baseline: { months: baselineMonths, n: baselineN },
    rising,
    falling,
    gaps: snapshot.filter((r) => r.status === "gap"),
    industries,
    options,
  };
}

/** Share as a whole percent, e.g. 0.333 → "33%". */
export const pct = (x: number) => `${Math.round(x * 100)}%`;
/** Change in percentage points, signed, e.g. "+12 pts". */
export const pts = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(Math.round(x * 100))} pts`;
