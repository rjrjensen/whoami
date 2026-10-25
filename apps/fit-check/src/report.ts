// The Fit Check report: types shared with the site, plus the rules that turn model output into a report.
// Scores, labels, and explanations are computed here, never asked of a model, so a job description
// can't talk its way into a better result.
import { evidenceById, skillByName, type EvidenceItem } from "./record";

export type Importance = "must" | "nice";
export type Coverage = "demonstrated" | "transferable" | "gap";
export type Status = "demonstrated" | "transferable" | "learning" | "unconfirmed" | "not_focus";
export type RoleType = "engineering_manager" | "lead_engineer" | "individual_contributor" | "other";
export type VersionId = "base" | "manager" | "lead";

export type Requirement = {
  text: string;
  importance: Importance;
  kind: "skill" | "experience" | "education" | "other";
  skill: string;
  relatedSkills: string[];
};

export type Extraction = {
  isJobDescription: boolean;
  roleTitle: string;
  company: string | null;
  roleType: RoleType;
  requirements: Requirement[];
};

/**
 * One requirement's classification. `importance` is Jev's reading of the posting (null from the Claude fallback, so
 * extraction's guess stands); `confidence` is Jev's calibrated confidence in the coverage, or null from the fallback.
 */
export type Match = { importance: Importance | null; coverage: Coverage; confidence: number | null; evidenceId: string | null; evidenceProbability: number | null };

export type SkillAnswer = { status: "have" | "learning" | "not_pursuing"; evidenceIds: string[]; note: string | null };

export type ReportEvidence = { id: string; kind: EvidenceItem["kind"]; title: string; dates: string };

export type ReportItem = {
  requirement: string;
  importance: Importance;
  skill: string;
  status: Status;
  /** True when the status is a judgment from related experience rather than something in the record. */
  inferred: boolean;
  /** Why it got this status; empty when the evidence links say it all. */
  reason: string;
  evidence: ReportEvidence[];
};

export type FitReport = {
  id: string;
  createdAt: string;
  role: { title: string; company: string | null; type: RoleType };
  score: number;
  label: "Strong fit" | "Good fit" | "Partial fit" | "Stretch";
  explanation: string;
  items: ReportItem[];
  strengths: ReportItem[];
  recommendedVersion: VersionId;
  matcher: "jev" | "claude";
  cached: boolean;
};

export const MAX_REQUIREMENTS = 25;
const MIN_PROBABILITY = 0.5;
const WEIGHT: Record<Importance, number> = { must: 3, nice: 1 };
const CREDIT: Record<Status, number> = { demonstrated: 1, transferable: 0.6, learning: 0.25, unconfirmed: 0, not_focus: 0 };

export const skillKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const toEvidence = (e: EvidenceItem): ReportEvidence => ({ id: e.id, kind: e.kind, title: e.title, dates: e.dates });
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);

export function judge(req: Requirement, match: Match, answer: SkillAnswer | undefined): ReportItem {
  const related = req.relatedSkills.filter((s) => skillByName.has(s));
  // Evidence: the matcher's pick (only when it's reasonably sure), then jobs where a related skill was used.
  const picked = match.evidenceId && (match.evidenceProbability ?? 1) >= MIN_PROBABILITY ? evidenceById.get(match.evidenceId) : undefined;
  const fromSkills = related.flatMap((s) => skillByName.get(s)!.usedAt).map((job) => evidenceById.get(`job-${slugify(job)}`));
  const evidence = [...new Map([picked, ...fromSkills].filter((e): e is EvidenceItem => !!e).map((e) => [e.id, e])).values()].slice(0, 3);
  const base = { requirement: req.text, importance: match.importance ?? req.importance, skill: req.skill };

  if (answer) {
    const confirmed = answer.evidenceIds.map((id) => evidenceById.get(id)).filter((e): e is EvidenceItem => !!e);
    if (answer.status === "have")
      return { ...base, status: "demonstrated", inferred: false, reason: answer.note ?? "Confirmed by Ryan.", evidence: (confirmed.length ? confirmed : evidence).map(toEvidence) };
    if (answer.status === "learning")
      return { ...base, status: "learning", inferred: false, reason: answer.note ?? "Ryan is learning this now.", evidence: [] };
    return { ...base, status: "not_focus", inferred: false, reason: answer.note ?? "Ryan isn't pursuing this right now.", evidence: [] };
  }

  const unconfirmed: ReportItem = { ...base, status: "unconfirmed", inferred: false, reason: "Not in Ryan's record yet. It's been flagged for him to confirm.", evidence: [] };
  const transferable = (): ReportItem => ({
    ...base,
    status: "transferable",
    inferred: true,
    reason: related.length
      ? `Inferred from ${list(related)}${evidence.length ? ` (${list(evidence.map((e) => e.title))})` : ""}.`
      : `Inferred from related work: ${list(evidence.map((e) => e.title))}.`,
    evidence: evidence.map(toEvidence),
  });
  const hasReason = evidence.length > 0 || related.length > 0;

  if (match.coverage === "demonstrated") {
    // Demonstrated needs something to point at; a model's say-so alone gets downgraded.
    if (evidence.length) return { ...base, status: "demonstrated", inferred: false, reason: "", evidence: evidence.map(toEvidence) };
    return hasReason ? transferable() : unconfirmed;
  }
  if (match.coverage === "transferable" && hasReason && (match.confidence ?? 1) >= MIN_PROBABILITY) return transferable();
  return unconfirmed;
}

export function score(items: ReportItem[]) {
  const total = items.reduce((n, i) => n + WEIGHT[i.importance], 0);
  if (!total) return 0;
  return Math.round((100 * items.reduce((n, i) => n + WEIGHT[i.importance] * CREDIT[i.status], 0)) / total);
}

export const labelFor = (s: number): FitReport["label"] => (s >= 80 ? "Strong fit" : s >= 60 ? "Good fit" : s >= 40 ? "Partial fit" : "Stretch");

export function explain(items: ReportItem[]) {
  const musts = items.filter((i) => i.importance === "must");
  const pool = musts.length ? musts : items;
  const noun = musts.length ? "must-haves" : "requirements";
  const count = (s: Status) => pool.filter((i) => i.status === s).length;
  const [shown, related, learning, open] = [count("demonstrated"), count("transferable"), count("learning"), count("unconfirmed")];
  const parts = [`Ryan's record directly shows ${shown} of ${pool.length} ${noun}${related ? `, and ${related} more through related experience` : ""}.`];
  if (learning) parts.push(`He's learning ${learning === 1 ? "1 more" : `${learning} more`}.`);
  if (open) parts.push(`${open} ${open === 1 ? "hasn't" : "haven't"} been confirmed yet.`);
  return parts.join(" ");
}

export const versionFor = (t: RoleType): VersionId => (t === "engineering_manager" ? "manager" : t === "other" ? "base" : "lead");

export function buildReport(
  extraction: Extraction,
  matches: Match[],
  answers: Map<string, SkillAnswer>,
  meta: { id: string; createdAt: string; matcher: FitReport["matcher"] },
): FitReport {
  const items = extraction.requirements.map((r, i) => judge(r, matches[i], answers.get(skillKey(r.skill))));
  const s = score(items);
  const strengths = items
    .filter((i) => i.status === "demonstrated")
    .sort((a, b) => WEIGHT[b.importance] - WEIGHT[a.importance])
    .slice(0, 4);
  return {
    ...meta,
    role: { title: extraction.roleTitle, company: extraction.company, type: extraction.roleType },
    score: s,
    label: labelFor(s),
    explanation: explain(items),
    items,
    strengths,
    recommendedVersion: versionFor(extraction.roleType),
    cached: false,
  };
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
