import { notFound } from "next/navigation";
import { SitePage } from "@/components/site-page";
import { sectionMetadata, sectionParams } from "@/lib/page-metadata";
import { pageBySlug } from "@/lib/pages";

type Props = { params: Promise<{ section: string }> };

export const generateStaticParams = sectionParams;

export async function generateMetadata({ params }: Props) {
  return sectionMetadata("lead", (await params).section);
}

export default async function LeadSectionPage({ params }: Props) {
  const page = pageBySlug((await params).section);
  if (!page) notFound();
  return <SitePage variant="lead" page={page.id} />;
}
