import type { Metadata } from "next";
import { pageBySlug, pageHref, SECTION_SLUGS } from "./pages";
import { getVariant, VARIANTS, type VariantId } from "./resume";

export const sectionParams = () => SECTION_SLUGS.map((section) => ({ section }));

/** Title, description, and canonical URL for a section page such as /manager/skills. */
export function sectionMetadata(variant: VariantId, slug: string): Metadata {
  const page = pageBySlug(slug);
  if (!page) return {};
  const v = getVariant(variant);
  const version = VARIANTS.find((o) => o.id === variant)!;
  return {
    title: variant === "base" ? page.title : `${page.title} (${version.label})`,
    description: variant === "base" ? undefined : v.cfg.summary,
    alternates: { canonical: pageHref(variant, page.id) },
  };
}
