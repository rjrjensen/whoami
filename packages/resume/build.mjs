// Builds every resume version from data/resume.yaml as Markdown, JSON Resume, TOML, Word, and PDF.
//   node packages/resume/build.mjs handouts   -> dist/<version>/, includes phone (for handing out directly)
//   node packages/resume/build.mjs site       -> apps/web/public/downloads/<version>/, no phone (public)
// PDF conversion needs LibreOffice (`soffice`) on PATH; it's skipped with a warning if missing.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { parse } from "yaml";
import { execFileSync } from "node:child_process";
import { stringify as toToml } from "smol-toml";
import { root, variants, preferences, impact, resolve, range, educationLine } from "./resume-data.mjs";
import { toDocx } from "./docx.mjs";

function toMarkdown({ basics, skills, work, education, certificates }) {
  const out = [];
  const contact = [basics.email, basics.phone, `${basics.location.city}, ${basics.location.region}`,
    ...[{ url: basics.url }, ...basics.profiles].map((p) => `[${p.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}](${p.url})`)].filter(Boolean);
  out.push(`# ${basics.name}`, "", `**${basics.label}**`, "", contact.join(" · "), "", basics.summary, "");

  out.push("## Technical Skills <sub>(\\* indicates proficiency)</sub>", "");
  for (const s of skills) out.push(`- **${s.name}:** ${s.keywords.map((k) => k.name + (k.proficient ? "\\*" : "")).join(", ")}`);
  out.push("", "## Experience", "");

  for (const w of work) {
    out.push(`### ${w.position} — ${w.name}`, "");
    out.push(`_${[range(w.startDate, w.endDate), w.location, w.endDate ? w.note : null].filter(Boolean).join(" · ")}_`, "");
    if (w.summary) out.push(w.summary, "");
    if (w.highlights.length) out.push(...w.highlights.map((h) => `- ${h}`), "");
    for (const r of w.roles ?? []) {
      out.push(`**${r.position}** (${range(r.startDate, r.endDate)})`, "", ...r.highlights.map((h) => `- ${h}`), "");
    }
    if (w.technologies) out.push(`**Technologies:** ${w.technologies.join(", ")}`, "");
    if (w.note && !w.endDate) out.push(`**Note:** ${w.note}`, "");
  }

  out.push("## Education & Certifications", "");
  for (const e of education) {
    const { degree, where, years } = educationLine(e);
    out.push(`**${degree}** — ${where} (${years})`, "");
  }
  for (const c of certificates) out.push(`**${c.name}**${c.issuer && c.date ? ` — ${c.issuer} (${c.date})` : ""}`, "");
  return out.join("\n").trimEnd() + "\n";
}

// JSON Resume output: drops our extension fields (variants, tags, proficient flags) so it validates against the schema.
function toJsonResume({ basics, skills, work, education, certificates }) {
  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics,
    work: work.map(({ variants, technologies, roles, note, ...w }) => ({
      ...w,
      highlights: [...w.highlights, ...(roles ?? []).flatMap((r) => r.highlights.map((h) => `${r.position}: ${h}`))],
      ...(technologies ? { summary: `${w.summary ?? ""}\n\nTechnologies: ${technologies.join(", ")}`.trim() } : {}),
    })),
    education,
    certificates,
    skills: skills.map((s) => ({ name: s.name, keywords: s.keywords.map((k) => k.name) })),
  };
}

const hasSoffice = (() => {
  try { execFileSync("soffice", ["--version"], { stdio: "ignore" }); return true; } catch { return false; }
})();

const target = process.argv[2] ?? "handouts";
const targets = {
  handouts: { out: `${root}dist`, includePhone: true },
  site: { out: `${root}apps/web/public/downloads`, includePhone: false },
};
const { out, includePhone } = targets[target] ?? (() => { throw new Error(`Unknown target "${target}". Use: ${Object.keys(targets).join(", ")}`); })();

// Which jobs mention a skill, for "skills with evidence". "React / Next.js" matches either name; "(Core)" is ignored.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function skillEvidence(skills, work) {
  const jobText = work.map((w) => ({
    id: w.name,
    text: [w.position, w.summary, ...w.highlights, ...(w.technologies ?? []), ...(w.roles ?? []).flatMap((r) => r.highlights)].join(" "),
  }));
  const evidence = {};
  for (const s of skills) for (const k of s.keywords) {
    const names = k.name.split("/").map((n) => n.replace(/\(.*?\)/g, "").trim()).filter(Boolean);
    const res = names.map((n) => new RegExp(`(^|[^\\w.#])${escapeRe(n)}(?![\\w#])`, "i"));
    evidence[k.name] = jobText.filter((j) => res.some((re) => re.test(j.text))).map((j) => j.id);
  }
  return evidence;
}

// Catch text cut short by YAML (e.g. an unquoted " #" starts a comment): every summary and bullet must end in punctuation.
for (const v of Object.keys(variants)) {
  const r = resolve(v);
  const texts = r.work.flatMap((w) => [w.summary, ...w.highlights, ...(w.roles ?? []).flatMap((x) => x.highlights)]).filter(Boolean);
  const bad = texts.filter((t) => !/[.!?)]$/.test(t.trim()));
  if (bad.length) throw new Error(`Text in data/resume.yaml looks truncated (no ending punctuation):\n  ${bad.join("\n  ")}`);
}

rmSync(out, { recursive: true, force: true });
const manifest = {};
const about = parse(readFileSync(`${root}data/about.yaml`, "utf8"));
const siteContent = { generatedAt: new Date().toISOString().slice(0, 10), preferences, impact, about, variants: {} };
for (const v of Object.keys(variants)) {
  const r = resolve(v, { includePhone });
  const dir = `${out}/${v}`;
  const base = `${dir}/${r.cfg.file}`;
  mkdirSync(dir, { recursive: true });
  const json = toJsonResume(r);
  writeFileSync(`${base}.md`, toMarkdown(r));
  writeFileSync(`${base}.json`, JSON.stringify(json, null, 2) + "\n");
  writeFileSync(`${base}.toml`, toToml(json) + "\n");
  writeFileSync(`${base}.docx`, await toDocx(r));
  const formats = ["pdf", "docx", "md", "json", "toml"];
  if (hasSoffice) execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, `${base}.docx`], { stdio: "ignore" });
  else formats.shift(), console.warn("soffice not found: skipped PDF");
  manifest[v] = {
    label: r.cfg.label,
    file: r.cfg.file,
    formats: formats.filter((f) => existsSync(`${base}.${f}`)).map((f) => ({ ext: f, bytes: statSync(`${base}.${f}`).size })),
  };
  siteContent.variants[v] = { ...r, evidence: skillEvidence(r.skills, r.work), downloads: manifest[v] };
  console.log(`built ${v} -> ${dir}`);
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
if (target === "site") {
  const contentDir = `${root}apps/web/src/content`;
  mkdirSync(contentDir, { recursive: true });
  writeFileSync(`${contentDir}/resume.json`, JSON.stringify(siteContent, null, 2) + "\n");
  console.log(`wrote ${contentDir}/resume.json`);
}
