import type { Metadata } from "next";
import { ResumePage } from "@/components/resume-page";
import { getVariant } from "@/lib/resume";

const v = getVariant("manager");

export const metadata: Metadata = {
  title: v.cfg.headline,
  description: v.cfg.summary,
  alternates: { canonical: "/manager" },
};

export default function ManagerPage() {
  return <ResumePage variant="manager" />;
}
