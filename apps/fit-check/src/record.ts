// Ryan's record, generated from data/resume.yaml by `npm run downloads`.
import record from "./record.json";

export type EvidenceItem = {
  id: string;
  kind: "profile" | "job" | "education" | "certificate" | "project";
  title: string;
  dates: string;
  detail?: string;
  technologies?: string[];
};
export type Skill = { name: string; group: string; proficient: boolean; usedAt: string[] };

export const RECORD = record as { name: string; location: string; preferences: Record<string, string>; skills: Skill[]; evidence: EvidenceItem[] };

export const SKILL_NAMES = RECORD.skills.map((s) => s.name) as [string, ...string[]];
export const skillByName = new Map(RECORD.skills.map((s) => [s.name, s]));
export const evidenceById = new Map(RECORD.evidence.map((e) => [e.id, e]));
