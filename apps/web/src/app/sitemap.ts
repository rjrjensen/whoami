import type { MetadataRoute } from "next";
import { site, VARIANTS } from "@/lib/resume";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = site.variants.base.basics.url;
  return VARIANTS.map((v) => ({ url: `${origin}${v.href === "/" ? "" : v.href}`, lastModified: site.generatedAt, priority: v.href === "/" ? 1 : 0.8 }));
}
