import Link from "next/link";
import { getVariant, site, VARIANTS, yearsOfSoftware, type VariantId } from "@/lib/resume";
import { Experience } from "./experience";
import { Skills } from "./skills";
import { Downloads } from "./downloads";
import { BeyondTheCode } from "./beyond-the-code";
import { PersonJsonLd } from "./person-json-ld";

const NAV = [
  { href: "#experience", label: "Experience" },
  { href: "#skills", label: "Skills" },
  { href: "#education", label: "Education" },
  { href: "#beyond", label: "About me" },
  { href: "#downloads", label: "Resume" },
  { href: "#contact", label: "Contact" },
];

export function ResumePage({ variant }: { variant: VariantId }) {
  const v = getVariant(variant);
  const { basics } = v;
  const github = basics.profiles.find((p) => p.network === "GitHub");
  const linkedin = basics.profiles.find((p) => p.network === "LinkedIn");

  return (
    <>
      <PersonJsonLd variant={v} />
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-xl tracking-tight">
            {basics.name}
          </Link>
          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="rounded-md px-3 py-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-line px-3 text-sm [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <nav aria-label="Sections" className="absolute right-0 mt-2 w-48 rounded-lg border border-line bg-surface p-2 shadow-lg">
              <ul>
                {NAV.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="block rounded-md px-3 py-3 text-sm hover:bg-surface-2">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </header>

      <main id="main">
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
            <a href="#downloads" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-accent-ink transition-transform hover:-translate-y-0.5">
              Download resume
            </a>
            <a href="#contact" className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-6 font-medium transition-colors hover:bg-surface-2">
              Get in touch
            </a>
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

        <Experience variant={v} />
        <Skills variant={v} />

        {/* Education */}
        <section id="education" aria-labelledby="education-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="education-title" className="font-display text-4xl sm:text-5xl">
            Education &amp; certifications
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <ul className="space-y-4">
              {v.education.map((e) => (
                <li key={e.institution + e.area} className="rounded-2xl border border-line bg-surface p-5">
                  <p className="font-medium">{e.studyType === "Coursework" ? `${e.area} coursework` : `${e.studyType} ${e.area}`}</p>
                  <p className="mt-1 text-muted">
                    {[e.institution, e.location].filter(Boolean).join(", ")} · {e.startDate ? `${e.startDate}–${e.endDate}` : e.endDate}
                  </p>
                </li>
              ))}
            </ul>
            <ul className="space-y-4">
              {v.certificates.map((c) => (
                <li key={c.name} className="rounded-2xl border border-line bg-surface p-5">
                  <p className="font-medium">{c.name}</p>
                  <p className="mt-1 text-muted">{[c.issuer, c.date].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <BeyondTheCode />

        <Downloads current={variant} />

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-title" className="bg-accent text-accent-ink">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="contact-title" className="font-display text-5xl sm:text-6xl">
              Let&rsquo;s connect.
            </h2>
            <p className="mt-4 max-w-2xl text-lg opacity-90">
              I&rsquo;m always open to interesting conversations, whether it&rsquo;s a job opportunity, a collaboration, a cool open-source
              project, or just talking shop. If you&rsquo;re hiring, send me the job description and a little about the team. I&rsquo;ll get
              back to you quickly, and I&rsquo;m happy to share my phone number once we&rsquo;ve connected.
            </p>
            <ul className="mt-8 flex flex-wrap gap-3">
              <li>
                <a
                  href={`mailto:${basics.email}?subject=${encodeURIComponent("Opportunity for Ryan")}`}
                  className="inline-flex min-h-12 items-center rounded-full bg-accent-ink px-6 font-medium text-accent transition-transform hover:-translate-y-0.5"
                >
                  Email {basics.email}
                </a>
              </li>
              {[linkedin, github].filter(Boolean).map((p) => (
                <li key={p!.network}>
                  <a href={p!.url} className="inline-flex min-h-12 items-center rounded-full border border-current/40 px-6 font-medium hover:bg-white/10">
                    {p!.network}
                    <span className="sr-only"> profile (opens external site)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {new Date(site.generatedAt).getFullYear()} {basics.name}. Last updated {site.generatedAt}.
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
    </>
  );
}
