// Fake Fit Check rows for local development and the axe check. Everything here is made up.
// Usage: npm run seed:local -w @ryanjensen/admin   (writes to fit-check's local D1; never --remote)
import { writeFileSync } from "node:fs";

const SKILLS = [
  ["Kubernetes", "must"], ["K8s", "nice"], ["NodeJS", "nice"], ["Node.js", "must"], ["Rust", "nice"], ["People management", "must"],
  ["Go", "nice"], ["Golang", "must"], ["Terraform", "nice"], ["React", "must"], ["Kotlin", "nice"], ["Hiring", "must"], ["GraphQL", "nice"],
];
const ROLES = [
  ["Engineering Manager", "engineering_manager"], ["Lead Software Engineer", "lead_engineer"], ["Senior Software Engineer", "individual_contributor"],
];
const COMPANIES = ["Example Insurance Co", "Acme Retail", "Fictional Bank", null];
const STATUS = ["demonstrated", "transferable", "unconfirmed", "learning"];

// A small deterministic random, so every run makes the same rows.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const q = (v) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const rows = [];
for (let i = 0; i < 36; i++) {
  const month = 7 + Math.floor(i / 9); // July–October 2026
  const created = `2026-${String(month).padStart(2, "0")}-${String(1 + (i % 9) * 3).padStart(2, "0")} 1${i % 10}:00:00`;
  const [title, type] = pick(ROLES);
  const company = pick(COMPANIES);
  const items = SKILLS.filter(() => rand() < 0.45 + month * 0.01).map(([skill, importance]) => ({
    requirement: `Experience with ${skill}`,
    importance,
    skill,
    status: pick(STATUS),
    inferred: false,
    reason: "",
    evidence: [],
  }));
  if (!items.length) items.push({ requirement: "Experience with Rust", importance: "must", skill: "Rust", status: "unconfirmed", inferred: false, reason: "", evidence: [] });
  const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const score = Math.floor(30 + rand() * 65);
  const report = {
    id, createdAt: created.replace(" ", "T") + ".000Z", role: { title, company, type }, score,
    label: score >= 80 ? "Strong fit" : score >= 60 ? "Good fit" : score >= 40 ? "Partial fit" : "Stretch",
    explanation: "A made-up report for local testing.", items, strengths: [], recommendedVersion: "manager", matcher: "claude", cached: false,
  };
  const jd = `${title} at ${company ?? "a company"}. Requirements:\n${items.map((it) => `- ${it.requirement} (${it.importance})`).join("\n")}\nThis posting is fake.`;
  // Every sixth row repeats the posting before it, as a cache hit.
  const repeat = i % 6 === 5;
  const hash = repeat ? `fake-hash-${i - 1}` : `fake-hash-${i}`;
  rows.push(
    `INSERT INTO fit_checks (id, created_at, jd_hash, jd_text, role_title, company, score, report_json, extractor, matcher, input_tokens, output_tokens, cached, ip_hash, source) VALUES (${[
      id, created, hash, jd, title, company, score, JSON.stringify({ ...report, cached: repeat }), repeat ? null : "claude-sonnet-5-5", "claude",
      repeat ? null : 1200, repeat ? null : 900, repeat ? 1 : 0, "fake", i % 4 === 0 ? "ryan" : "visitor",
    ].map(q).join(", ")});`,
  );
  for (const it of items.filter((it) => it.status === "unconfirmed"))
    rows.push(
      `INSERT INTO skill_questions (skill_key, skill, example, importance, last_fit_check_id) VALUES (${[it.skill.toLowerCase(), it.skill, it.requirement, it.importance, id].map(q).join(", ")})
       ON CONFLICT (skill_key) DO UPDATE SET times_asked = times_asked + 1, importance = CASE WHEN excluded.importance = 'must' THEN 'must' ELSE importance END;`,
    );
}

const out = process.argv[2] ?? "fake-data.sql";
writeFileSync(out, `DELETE FROM fit_checks WHERE ip_hash = 'fake';\n${rows.join("\n")}\n`);
console.log(`Wrote ${rows.length} statements to ${out}`);
