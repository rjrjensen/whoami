import { notFound } from "next/navigation";
import { SitePage } from "@/components/site-page";
import { sectionMetadata, sectionParams } from "@/lib/page-metadata";
import { pageBySlug } from "@/lib/pages";

type Props = { params: Promise<{ section: string }> };

export const generateStaticParams = sectionParams;

// Every page reads the slug from `params`, so the whole page is URL data. Blocking until it arrives (it is prerendered,
// so it is fast) lets the page turn straight to the finished page instead of a loading placeholder.
export const instant = false;

export async function generateMetadata({ params }: Props) {
  return sectionMetadata("base", (await params).section);
}

export default async function SectionPage({ params }: Props) {
  const page = pageBySlug((await params).section);
  if (!page) notFound();
  return <SitePage variant="base" page={page.id} />;
}
