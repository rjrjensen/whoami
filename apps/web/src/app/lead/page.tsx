import type { Metadata } from "next";
import { SitePage } from "@/components/site-page";
import { getVariant } from "@/lib/resume";

const v = getVariant("lead");

export const metadata: Metadata = {
  title: v.cfg.headline,
  description: v.cfg.summary,
  alternates: { canonical: "/lead" },
};

export default function LeadPage() {
  return <SitePage variant="lead" page="home" />;
}
