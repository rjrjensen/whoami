import type { MetadataRoute } from "next";
import { site } from "@/lib/resume";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${site.variants.base.basics.url}/sitemap.xml` };
}
