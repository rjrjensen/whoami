import { fmtMonth, slug, type Variant } from "@/lib/resume";

export function Experience({ variant }: { variant: Variant }) {
  return (
    <section id="experience" aria-labelledby="experience-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">The route so far</p>
      <h1 id="experience-title" className="mt-2 font-display text-4xl sm:text-5xl">
        Experience
      </h1>

      <ol className="relative mt-12">
        {/* The route: decorative line behind the stops. */}
        <span aria-hidden="true" className="route-line absolute bottom-2 left-[11px] top-2 w-[3px] rounded-full bg-gradient-to-b from-accent via-accent to-signal sm:left-[15px]" />
        {variant.work.map((job, i) => (
          <li key={job.name} id={`job-${slug(job.name)}`} className="reveal relative pb-12 pl-10 last:pb-0 sm:pl-14">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1.5 grid size-[25px] place-items-center rounded-full border-[3px] border-accent bg-bg sm:size-[33px] ${
                i === 0 ? "ring-4 ring-accent-soft" : ""
              }`}
            >
              <span className={`size-2 rounded-full sm:size-2.5 ${job.endDate ? "bg-accent/50" : "bg-signal"}`} />
            </span>

            <article aria-labelledby={`job-${slug(job.name)}-title`} className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_0_var(--line)] sm:p-7">
              <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <div>
                  <h2 id={`job-${slug(job.name)}-title`} className="text-xl font-semibold leading-snug">
                    {job.position}
                  </h2>
                  <p className="mt-0.5 text-accent">
                    {job.url ? (
                      <a href={job.url} className="underline-offset-4 hover:underline">
                        {job.name}
                      </a>
                    ) : (
                      job.name
                    )}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm text-muted">
                  <time dateTime={job.startDate}>{fmtMonth(job.startDate)}</time> –{" "}
                  {job.endDate ? <time dateTime={job.endDate}>{fmtMonth(job.endDate)}</time> : "Present"}
                </p>
              </header>
              {(job.location || job.note) && (
                <p className="mt-1 text-sm text-muted">{[job.location, job.note].filter(Boolean).join(" · ")}</p>
              )}

              {job.summary && <p className="mt-4 leading-relaxed">{job.summary}</p>}
              {job.highlights.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {job.highlights.map((h) => (
                    <li key={h} className="relative pl-5 leading-relaxed before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-signal">
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {job.roles && (
                <ol className="mt-5 space-y-4 border-l-2 border-dashed border-line pl-4">
                  {job.roles.map((r) => (
                    <li key={r.position}>
                      <h3 className="font-semibold">
                        {r.position}{" "}
                        <span className="font-mono text-sm font-normal text-muted">
                          {fmtMonth(r.startDate)} – {fmtMonth(r.endDate)}
                        </span>
                      </h3>
                      <ul className="mt-1.5 space-y-1.5">
                        {r.highlights.map((h) => (
                          <li key={h} className="relative pl-5 leading-relaxed text-ink/90 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-line">
                            {h}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}

              {job.technologies && (
                <div className="mt-5">
                  <h3 className="sr-only">Technologies</h3>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
                    {job.technologies.map((t) => (
                      <li key={t} className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
