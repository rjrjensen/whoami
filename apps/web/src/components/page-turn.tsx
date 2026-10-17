import Link from "next/link";
import { pageHref, pageIndex, PAGES, type PageId } from "@/lib/pages";
import type { VariantId } from "@/lib/resume";

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "right" ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
    </svg>
  );
}

// Storybook-style page turning at the bottom of every page.
export function PageTurn({ variant, page }: { variant: VariantId; page: PageId }) {
  const i = pageIndex(page);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  const track = (to: PageId, direction: "forward" | "back") => ({
    "data-track": "page_turn",
    "data-from": page,
    "data-to": to,
    "data-direction": direction,
  });

  return (
    <nav aria-label="Page turn" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-16 pt-4 sm:px-6">
      {prev ? (
        <Link
          href={pageHref(variant, prev.id)}
          transitionTypes={["page-back"]}
          {...track(prev.id, "back")}
          className="group inline-flex min-h-12 items-center gap-3 rounded-full px-2 text-muted transition-colors hover:text-ink"
        >
          <span className="grid size-12 place-items-center rounded-full border border-line bg-surface transition-transform group-hover:-translate-x-0.5">
            <Arrow dir="left" />
          </span>
          <span className="hidden text-sm sm:inline">
            <span className="sr-only">Previous page: </span>
            {prev.label}
          </span>
          <span className="sr-only sm:hidden">Previous page: {prev.label}</span>
        </Link>
      ) : (
        <span />
      )}

      <p className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.18em] text-muted">
        Page {i + 1} <span className="normal-case">of</span> {PAGES.length}
      </p>

      {next ? (
        <Link
          href={pageHref(variant, next.id)}
          transitionTypes={["page-forward"]}
          {...track(next.id, "forward")}
          className="group inline-flex min-h-12 items-center gap-3 rounded-full text-ink"
        >
          <span className="text-right text-sm">
            <span className="block font-mono text-xs uppercase tracking-[0.16em] text-muted">Next</span>
            <span className="sr-only">page: </span>
            <span className="font-medium">{next.label}</span>
          </span>
          <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-md transition-transform group-hover:translate-x-1">
            <Arrow dir="right" />
          </span>
        </Link>
      ) : (
        <Link
          href={pageHref(variant, "home")}
          transitionTypes={["page-back"]}
          {...track("home", "back")}
          className="group inline-flex min-h-12 items-center gap-3 rounded-full text-ink"
        >
          <span className="text-right text-sm font-medium">Back to the beginning</span>
          <span className="grid size-14 place-items-center rounded-full border border-line bg-surface transition-transform group-hover:-translate-x-0.5">
            <Arrow dir="left" />
          </span>
        </Link>
      )}
    </nav>
  );
}
