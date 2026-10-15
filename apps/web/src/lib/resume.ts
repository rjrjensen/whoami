// Typed access to src/content/resume.json, which `npm run downloads` generates from data/resume.yaml.
import content from "@/content/resume.json";

export type VariantId = "base" | "manager" | "lead";

export type Keyword = { name: string; proficient?: boolean };
export type SkillGroup = { name: string; keywords: Keyword[] };
export type Role = { position: string; startDate: string; endDate?: string; highlights: string[] };
export type Job = {
  name: string;
  position: string;
  url?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  note?: string;
  summary?: string;
  highlights: string[];
  technologies?: string[];
  roles?: Role[];
};
export type Download = { ext: string; bytes: number };
export type Variant = {
  cfg: { file: string; label: string; headline: string; summary: string; intro: string };
  basics: {
    name: string;
    email: string;
    url: string;
    label: string;
    summary: string;
    location: { city: string; region: string };
    profiles: { network: string; username: string; url: string }[];
  };
  skills: SkillGroup[];
  work: Job[];
  education: { institution: string; studyType: string; area: string; location?: string; startDate?: string; endDate: string }[];
  certificates: { name: string; issuer?: string; date?: string }[];
  evidence: Record<string, string[]>;
  downloads: { label: string; file: string; formats: Download[] };
};

export const site = content as unknown as {
  generatedAt: string;
  preferences: { workArrangement: string; workAuthorization: string };
  impact: { value: string; label: string }[];
  about: {
    tagline: string;
    beyond: { title: string; text: string }[];
    projects: { name: string; url: string; text: string }[];
  };
  variants: Record<VariantId, Variant>;
};

export const VARIANTS: { id: VariantId; href: string; label: string; short: string }[] = [
  { id: "base", href: "/", label: "Complete", short: "Complete" },
  { id: "manager", href: "/manager", label: "Engineering Manager", short: "Manager" },
  { id: "lead", href: "/lead", label: "Lead Engineer", short: "Lead" },
];

export const getVariant = (id: VariantId) => site.variants[id];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtMonth = (d?: string) => {
  if (!d) return "Present";
  const [y, m] = d.split("-");
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
};

export const fmtBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export const FORMAT_LABELS: Record<string, { name: string; hint: string }> = {
  pdf: { name: "PDF", hint: "Best for reading and printing" },
  docx: { name: "Word", hint: "Editable, ATS-friendly" },
  md: { name: "Markdown", hint: "Plain text" },
  json: { name: "JSON", hint: "JSON Resume schema" },
  toml: { name: "TOML", hint: "Structured data" },
};

export const downloadHref = (id: VariantId, file: string, ext: string) => `/downloads/${id}/${encodeURIComponent(file)}.${ext}`;

// Software experience starts at Brownells (January 2018). Measured at build time so pages stay static.
export const yearsOfSoftware = () => {
  const ms = new Date(site.generatedAt).getTime() - new Date("2018-01-01").getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
};

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
