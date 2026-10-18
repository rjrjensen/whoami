// One name per skill. Every variant a posting uses is saved as an alias of one skill (D1: skills, skill_aliases),
// so each variant is matched once and is a plain lookup after that. Resolving runs in server/skills.ts:
//   1. tidy the raw name (below)
//   2. look the tidied name up in skill_aliases
//   3. only an unseen variant is matched: in code today (matchSkill), by Jev later. The result is saved as a new alias.

/** Step 1, keeping case for display: Unicode forms, dashes, quotes, whitespace, and stray punctuation at the ends. */
export const tidySkill = (raw: string) =>
  raw
    .normalize("NFKC")
    .replace(/[‐-―]/g, "-")
    .replace(/[“”"'`’‘]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:!?*•·-]+|[\s.,;:!?*•·-]+$/g, "");

/** The alias key: the tidied name, lowercased. "  NodeJS. " → "nodejs". */
export const cleanSkill = (raw: string) => tidySkill(raw).toLowerCase();

/** A looser form for matching: letters, digits, # and + only. "Node.js", "NodeJS", and "node js" all become "nodejs". */
export const looseSkill = (raw: string) => cleanSkill(raw).replace(/[^\p{L}\p{N}#+]/gu, "");

/** Variants tidying can't catch, as loose form → display name. Ryan can move any alias in the admin app. */
export const ALIASES: Record<string, string> = {
  k8s: "Kubernetes",
  js: "JavaScript",
  ecmascript: "JavaScript",
  ts: "TypeScript",
  postgres: "PostgreSQL",
  golang: "Go",
  csharp: "C#",
  dotnet: ".NET (Core)",
  dotnetcore: ".NET (Core)",
  aspnetcore: ".NET (Core)",
  efcore: "Entity Framework Core",
  reactjs: "React / Next.js",
  vue: "Vue.js",
  springboot: "Spring / Spring Boot",
  amazonwebservices: "AWS",
  microsoftazure: "Azure",
  gcp: "Google Cloud",
  googlecloudplatform: "Google Cloud",
  mssql: "SQL Server",
  microsoftsqlserver: "SQL Server",
  tsql: "SQL",
  transactsql: "SQL",
  githubci: "GitHub Actions",
  vscode: "Visual Studio / VS Code",
};

/** The names a skill also goes by: "CSS / Sass / Less" → CSS, Sass, Less; "Linux (cron)" → Linux. */
export function variantsOf(name: string): string[] {
  const parts = name.includes(" / ") ? name.split(" / ") : [];
  const bare = name.replace(/\s*\([^)]*\)\s*$/, "");
  return [...new Set([name, ...parts, bare].map((v) => v.trim()).filter(Boolean))];
}

/**
 * Step 3 in code: which known skill an unseen variant is, or null for a new skill.
 * `known` maps loose forms (of skill names, their variants, and saved aliases) to display names.
 * This is the one place Jev's matching will plug in.
 */
export function matchSkill(raw: string, known: Map<string, string>): string | null {
  const loose = looseSkill(raw);
  if (!loose) return null;
  return ALIASES[loose] ?? known.get(loose) ?? null;
}

/** Loose form → display name for a list of skill names and their variants. Earlier names win a clash. */
export function knownSkills(names: string[]): Map<string, string> {
  const known = new Map<string, string>();
  for (const name of names) for (const v of variantsOf(name)) if (!known.has(looseSkill(v))) known.set(looseSkill(v), name);
  return known;
}
