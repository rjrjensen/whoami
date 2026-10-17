import { ViewTransition } from "react";
import { pageHref, type PageId } from "@/lib/pages";
import { getVariant, site, type VariantId } from "@/lib/resume";
import { PageTurn } from "./page-turn";
import { Home } from "./home";
import { Experience } from "./experience";
import { Skills } from "./skills";
import { Education } from "./education";
import { BeyondTheCode } from "./beyond-the-code";
import { Downloads } from "./downloads";
import { Contact } from "./contact";
import { PersonJsonLd } from "./person-json-ld";

// Navigations run as view transitions; the page-turn animation itself is CSS on the root snapshot (globals.css),
// keyed by the link's transition type. Untyped navigations (browser back/forward, version switches) swap instantly.

export function SitePage({ variant, page }: { variant: VariantId; page: PageId }) {
  const v = getVariant(variant);

  return (
    <>
      {page === "home" && <PersonJsonLd variant={v} />}
      <ViewTransition default="none">
        <div className="bg-bg">
          <main id="main">
            {page === "home" && <Home variant={variant} v={v} />}
            {page === "experience" && <Experience variant={v} />}
            {page === "skills" && (
              <>
                <Skills variant={v} experienceHref={pageHref(variant, "experience")} />
                <Education variant={v} />
              </>
            )}
            {page === "about" && <BeyondTheCode />}
            {page === "resume" && <Downloads current={variant} />}
            {page === "contact" && <Contact variant={v} />}
          </main>
          <PageTurn variant={variant} page={page} />
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
              <p>
                © {new Date(site.generatedAt).getFullYear()} {v.basics.name}. Last updated {site.generatedAt}.
              </p>
              <p>
                Built with caffeine, curiosity, and way too many <em>vertical</em> browser tabs. Next.js on Vercel.{" "}
                <a href="https://github.com/rjrjensen/whoami" className="underline underline-offset-4 hover:text-ink">
                  View the source
                </a>
                .
              </p>
            </div>
          </footer>
        </div>
      </ViewTransition>
    </>
  );
}
