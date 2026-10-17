import { VARIANTS, type VariantId } from "./resume";

// The site reads like a book: one page per section, in this order, for each resume version.
export const PAGES = [
  { id: "home", slug: "", label: "Home", title: "Hey, I'm Ryan" },
  { id: "experience", slug: "experience", label: "Experience", title: "Experience" },
  { id: "skills", slug: "skills", label: "Skills", title: "Skills" },
  { id: "education", slug: "education", label: "Education", title: "Education & certifications" },
  { id: "about", slug: "about", label: "About me", title: "Beyond the code" },
  { id: "resume", slug: "resume", label: "Resume", title: "Download my resume" },
  { id: "contact", slug: "contact", label: "Contact", title: "Let's connect" },
] as const;

export type PageId = (typeof PAGES)[number]["id"];
export type SectionSlug = Exclude<(typeof PAGES)[number]["slug"], "">;

export const SECTION_SLUGS = PAGES.map((p) => p.slug).filter((s): s is SectionSlug => s !== "");

export const pageIndex = (id: PageId) => PAGES.findIndex((p) => p.id === id);
export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug && slug !== "");

/** URL of a page within a resume version, e.g. ("manager", "skills") → "/manager/skills". */
export function pageHref(variant: VariantId, id: PageId) {
  const root = VARIANTS.find((v) => v.id === variant)!.href;
  const slug = PAGES[pageIndex(id)].slug;
  if (!slug) return root;
  return root === "/" ? `/${slug}` : `${root}/${slug}`;
}

/** View transition type for moving between two pages: forward turns the page, back turns it the other way. */
export const turnType = (from: PageId, to: PageId) => (pageIndex(to) > pageIndex(from) ? "page-forward" : "page-back");

/** Resume version and page for a URL path; `page` is undefined for paths that aren't site pages. */
export function parsePath(pathname: string): { variant: VariantId; page?: PageId } {
  const parts = pathname.split("/").filter(Boolean);
  const variant = VARIANTS.find((v) => v.href !== "/" && v.href.slice(1) === parts[0])?.id ?? "base";
  if (variant !== "base") parts.shift();
  if (parts.length === 0) return { variant, page: "home" };
  return { variant, page: parts.length === 1 ? pageBySlug(parts[0])?.id : undefined };
}
