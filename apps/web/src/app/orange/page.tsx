import type { Metadata, Viewport } from "next";
import { SitePage } from "@/components/site-page";
import "./palette.css";

// A palette experiment for the brand work: the home page in another set of colors. Kept out of search and the sitemap.
export const metadata: Metadata = {
  title: "Orange palette preview",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae2b7" },
    { media: "(prefers-color-scheme: dark)", color: "#003049" },
  ],
};

export default function OrangePreview() {
  return (
    <div data-palette="orange" className="contents">
      <SitePage variant="base" page="home" />
    </div>
  );
}
