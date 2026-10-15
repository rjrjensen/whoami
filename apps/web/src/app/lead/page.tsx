import type { Metadata } from "next";
import { ResumePage } from "@/components/resume-page";
import { getVariant } from "@/lib/resume";

const v = getVariant("lead");

export const metadata: Metadata = {
  title: v.cfg.headline,
  description: v.cfg.summary,
  alternates: { canonical: "/lead" },
};

export default function LeadPage() {
  return <ResumePage variant="lead" />;
}
