// Loads data/resume.yaml and resolves it into a single resume version (base, manager, lead).
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

export const root = new URL("../..", import.meta.url).pathname;
const resume = parse(readFileSync(`${root}data/resume.yaml`, "utf8"));
export const variants = parse(readFileSync(`${root}data/variants.yaml`, "utf8"));

// The phone number lives in the gitignored private/ folder so it never reaches the public repo or site.
const privateContact = `${root}private/contact.yaml`;
if (existsSync(privateContact)) resume.basics.phone = parse(readFileSync(privateContact, "utf8")).phone;

export const { preferences, impact } = resume;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const fmtDate = (d) => {
  if (!d) return "Present";
  const [y, m] = String(d).split("-");
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
};
export const range = (a, b) => (a ? `${fmtDate(a)} – ${fmtDate(b)}` : fmtDate(b));

const inVariant = (item, v) => !item.variants || item.variants.includes(v);
const pick = (value, v) => (value && typeof value === "object" && !Array.isArray(value) ? value[v] ?? value.default : value);

// Highlights move up by their best-ranked tag in the version's `promote` list; ties keep source order.
const orderHighlights = (highlights = [], promote = []) => {
  const score = (h) => Math.min(promote.length, ...(h.tags ?? []).map((t) => promote.indexOf(t)).filter((i) => i >= 0));
  return highlights.map((h, i) => ({ h, i })).sort((a, b) => score(a.h) - score(b.h) || a.i - b.i).map(({ h }) => h);
};

// includePhone: false for copies published on the public site; the phone is shared only with trusted contacts.
export function resolve(v, { includePhone = true } = {}) {
  const cfg = variants[v];
  const { phone, ...basics } = resume.basics;
  const work = resume.work.filter((w) => inVariant(w, v)).map((w) => ({
    ...w,
    summary: pick(w.summary, v),
    highlights: orderHighlights((w.highlights ?? []).filter((h) => inVariant(h, v)), cfg.promote).map((h) => h.text),
  }));
  return {
    cfg,
    basics: { ...basics, ...(includePhone && phone ? { phone } : {}), label: cfg.headline, summary: cfg.summary },
    skills: resume.skills.filter((s) => inVariant(s, v)),
    work,
    education: resume.education,
    certificates: resume.certificates,
  };
}

export const educationLine = (e) => ({
  degree: e.studyType === "Coursework" ? `${e.area} coursework` : `${e.studyType} ${e.area}`,
  where: [e.institution, e.location].filter(Boolean).join(", "),
  years: e.startDate ? `${e.startDate} – ${e.endDate}` : e.endDate,
});
