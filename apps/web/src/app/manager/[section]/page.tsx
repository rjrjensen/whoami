import { notFound } from "next/navigation";
import { SitePage } from "@/components/site-page";
import { sectionMetadata, sectionParams } from "@/lib/page-metadata";
import { pageBySlug } from "@/lib/pages";

type Props = { params: Promise<{ section: string }> };

export const generateStaticParams = sectionParams;

export async function generateMetadata({ params }: Props) {
  return sectionMetadata("manager", (await params).section);
}

export default async function ManagerSectionPage({ params }: Props) {
  const page = pageBySlug((await params).section);
  if (!page) notFound();
  return <SitePage variant="manager" page={page.id} />;
}
