import type { Metadata } from "next";
import { SitePage } from "@/components/site-page";
import { getVariant } from "@/lib/resume";

const v = getVariant("manager");

export const metadata: Metadata = {
  title: v.cfg.headline,
  description: v.cfg.summary,
  alternates: { canonical: "/manager" },
};

export default function ManagerPage() {
  return <SitePage variant="manager" page="home" />;
}
