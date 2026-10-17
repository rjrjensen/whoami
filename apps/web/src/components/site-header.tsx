"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pageHref, PAGES, parsePath, turnType, type PageId } from "@/lib/pages";
import { MobileMenu } from "./mobile-menu";

const NAV = PAGES.filter((p) => p.id !== "home");

// Lives in the root layout so it stays mounted (and still) while pages turn below it. On pages outside the book
// (e.g. 404), links are plain navigations.
export function SiteHeader({ name }: { name: string }) {
  const { variant, page } = parsePath(usePathname());
  const turn = (to: PageId) => (page && page !== to ? [turnType(page, to)] : undefined);
  const links = NAV.map((n) => ({
    ...n,
    href: pageHref(variant, n.id),
    current: n.id === page,
    types: turn(n.id),
  }));

  return (
    // Named so it stays put while the page below it turns.
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={pageHref(variant, "home")}
          transitionTypes={turn("home")}
          aria-current={page === "home" ? "page" : undefined}
          className="font-display text-xl tracking-tight"
        >
          {name}
        </Link>
        <nav aria-label="Pages" className="hidden md:block">
          <ul className="flex gap-1 text-sm">
            {links.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  transitionTypes={n.types}
                  aria-current={n.current ? "page" : undefined}
                  className={`rounded-md px-3 py-2 transition-colors hover:bg-surface-2 hover:text-ink ${n.current ? "bg-surface-2 text-ink" : "text-muted"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <MobileMenu>
          <nav aria-label="Pages" className="absolute right-0 mt-2 w-48 rounded-lg border border-line bg-surface p-2 shadow-lg">
            <ul>
              {links.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    transitionTypes={n.types}
                    aria-current={n.current ? "page" : undefined}
                    className={`block rounded-md px-3 py-3 text-sm hover:bg-surface-2 ${n.current ? "bg-surface-2 font-medium" : ""}`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}
