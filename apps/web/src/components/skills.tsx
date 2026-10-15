import { slug, type Variant } from "@/lib/resume";

export function Skills({ variant }: { variant: Variant }) {
  return (
    <section id="skills" aria-labelledby="skills-title" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 id="skills-title" className="font-display text-4xl sm:text-5xl">
          Skills, with receipts
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Select a skill to see where I&rsquo;ve used it.{" "}
          <span className="inline-flex items-center gap-1.5 align-middle">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-signal" /> marks a skill I&rsquo;m proficient in.
          </span>
        </p>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {variant.skills.map((group) => (
            <div key={group.name}>
              <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{group.name}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.keywords.map((k) => {
                  const id = `skill-${slug(group.name)}-${slug(k.name)}`;
                  const jobs = variant.evidence[k.name] ?? [];
                  return (
                    <li key={k.name}>
                      <button
                        type="button"
                        popoverTarget={id}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-bg px-3.5 text-sm transition-colors hover:border-accent hover:text-accent"
                      >
                        {k.proficient && <span aria-hidden="true" className="size-2 rounded-full bg-signal" />}
                        {k.name}
                        {k.proficient && <span className="sr-only">(proficient)</span>}
                      </button>
                      <div
                        id={id}
                        popover="auto"
                        role="dialog"
                        aria-label={`Where Ryan used ${k.name}`}
                        className="fixed left-1/2 top-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 text-ink shadow-2xl backdrop:bg-black/30"
                      >
                        <p className="font-semibold">
                          {k.name}
                          {k.proficient && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Proficient</span>}
                        </p>
                        {jobs.length > 0 ? (
                          <>
                            <p className="mt-3 text-sm text-muted">Used at:</p>
                            <ul className="mt-1.5 space-y-1">
                              {jobs.map((j) => (
                                <li key={j}>
                                  <a href={`#job-${slug(j)}`} className="text-accent underline-offset-4 hover:underline">
                                    {j}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-muted">Ask me where I&rsquo;ve used this.</p>
                        )}
                        <button type="button" popoverTarget={id} popoverTargetAction="hide" className="mt-4 min-h-11 rounded-full border border-line px-4 text-sm hover:bg-surface-2">
                          Close
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
