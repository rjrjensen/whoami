import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { site } from "@/lib/resume";
import { SiteHeader } from "@/components/site-header";
import { KeyboardTurn } from "@/components/keyboard-turn";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display-serif", subsets: ["latin"], weight: "400" });

const base = site.variants.base;

export const metadata: Metadata = {
  metadataBase: new URL(base.basics.url),
  title: { default: `${base.basics.name}: Engineering Leader & Software Engineer`, template: `%s · ${base.basics.name}` },
  description: site.about.tagline,
  authors: [{ name: base.basics.name, url: base.basics.url }],
  openGraph: { type: "profile", siteName: base.basics.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1113" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // view-transition-name keeps React from opting the root out of view transitions, so pages can turn (globals.css).
    // data-scroll-behavior lets Next jump (not smooth-scroll) to the top of the new page during a navigation.
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
      style={{ viewTransitionName: "root" }}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <SiteHeader name={base.basics.name} />
        <KeyboardTurn />
        {children}
      </body>
    </html>
  );
}
