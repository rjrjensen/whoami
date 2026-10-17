import type { MetadataRoute } from "next";
import { pageHref, PAGES } from "@/lib/pages";
import { site, VARIANTS } from "@/lib/resume";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = site.variants.base.basics.url;
  return VARIANTS.flatMap((v) =>
    PAGES.map((p) => {
      const href = pageHref(v.id, p.id);
      return {
        url: `${origin}${href === "/" ? "" : href}`,
        lastModified: site.generatedAt,
        priority: href === "/" ? 1 : p.id === "home" ? 0.8 : v.id === "base" ? 0.7 : 0.5,
      };
    }),
  );
}
