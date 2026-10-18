import Link from "next/link";
import { pageHref, turnType } from "@/lib/pages";
import { FitCheckForm } from "./fit-check";
import { site, VARIANTS, yearsOfSoftware, type Variant, type VariantId } from "@/lib/resume";

export function Home({ variant, v }: { variant: VariantId; v: Variant }) {
  const { basics } = v;
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
        <nav aria-label="Resume version" className="hero-in mb-8">
          <p id="version-label" className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Viewing as
          </p>
          <ul aria-labelledby="version-label" className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1 sm:inline-flex">
            {VARIANTS.map((opt) => {
              const current = opt.id === variant;
              return (
                <li key={opt.id}>
                  <Link
                    href={opt.href}
                    aria-current={current ? "page" : undefined}
                    data-track={current ? undefined : "version_switch"}
                    data-from={variant}
                    data-to={opt.id}
                    className={`flex min-h-11 items-center justify-center rounded-full px-3 text-sm transition-colors sm:px-4 ${
                      current ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <span className="sm:hidden">{opt.short}</span>
                    <span className="hidden sm:inline">{opt.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="hero-in font-mono text-sm uppercase tracking-[0.18em] text-signal">{basics.label}</p>
        <h1 id="hero-title" className="hero-in hero-in-2 mt-3 font-display text-6xl leading-[0.95] tracking-tight sm:text-8xl">
          <span className="block text-3xl text-muted sm:text-4xl">Hey, I&rsquo;m</span>
          {basics.name}
        </h1>
        <p className="hero-in hero-in-3 mt-6 max-w-3xl text-lg leading-relaxed text-muted sm:text-xl">{v.cfg.intro}</p>
        <p className="hero-in hero-in-3 mt-4 max-w-3xl font-display text-2xl italic leading-snug sm:text-3xl">
          From loading trucks to leading engineering teams, I&rsquo;ve been shipping things since 2013.
        </p>

        <div className="hero-in hero-in-3 mt-8 flex flex-wrap gap-3">
          <a
            href="#fit-check"
            className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
          >
            Check fit for your role
          </a>
          <Link
            href={pageHref(variant, "resume")}
            transitionTypes={[turnType("home", "resume")]}
            className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:bg-surface-2"
          >
            Download resume
          </Link>
          <Link
            href={pageHref(variant, "contact")}
            transitionTypes={[turnType("home", "contact")]}
            className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:bg-surface-2"
          >
            Get in touch
          </Link>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Based in", `${basics.location.city}, ${basics.location.region}`],
            ["Work style", site.preferences.workArrangement],
            ["Authorization", site.preferences.workAuthorization],
            ["Experience", `${yearsOfSoftware()}+ years in software, plus nearly 4 years supervising frontline teams`],
          ].map(([k, val]) => (
            <div key={k} className="bg-surface p-5">
              <dt className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{k}</dt>
              <dd className="mt-1.5 font-medium">{val}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Impact */}
      <section aria-labelledby="impact-title" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="impact-title" className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            A few numbers I&rsquo;m proud of
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {site.impact.map((s) => (
              <li key={s.label} className="reveal">
                <p className="font-display text-5xl text-accent">{s.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Fit Check: just the box here; the report opens at /fit-check. */}
      <section id="fit-check" aria-labelledby="fit-check-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
          <div>
            <h2 id="fit-check-title" className="font-display text-4xl sm:text-5xl">
              Do I fit your role?
            </h2>
            <p className="mt-4 text-muted">
              Paste a job description for an honest, requirement-by-requirement read on how my experience lines up, with links to where
              I&rsquo;ve done the work. Anything inferred is labeled as inferred.
            </p>
          </div>
          <FitCheckForm variant={variant} compact />
        </div>
      </section>
    </>
  );
}
