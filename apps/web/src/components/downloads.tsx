import { downloadHref, fmtBytes, FORMAT_LABELS, site, VARIANTS, type VariantId } from "@/lib/resume";

export function Downloads({ current }: { current: VariantId }) {
  // The version being viewed comes first.
  const ordered = [...VARIANTS].sort((a, b) => Number(b.id === current) - Number(a.id === current));

  return (
    <section id="downloads" aria-labelledby="downloads-title" className="border-t border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 id="downloads-title" className="font-display text-4xl sm:text-5xl">
          Take the resume with you
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Three versions, five formats. Word and PDF work with applicant tracking systems; JSON follows the{" "}
          <a href="https://jsonresume.org/schema" className="text-accent underline underline-offset-4">
            JSON Resume
          </a>{" "}
          schema.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {ordered.map(({ id }) => {
            const d = site.variants[id].downloads;
            return (
              <section
                key={id}
                aria-labelledby={`dl-${id}`}
                className={`rounded-2xl border bg-surface p-6 ${id === current ? "border-accent ring-2 ring-accent-soft" : "border-line"}`}
              >
                <h3 id={`dl-${id}`} className="text-lg font-semibold">
                  {d.label}
                  {id === current && <span className="ml-2 align-middle font-mono text-xs font-normal uppercase tracking-wider text-accent">Viewing</span>}
                </h3>
                <ul className="mt-4 space-y-2">
                  {d.formats.map((f) => (
                    <li key={f.ext}>
                      <a
                        href={downloadHref(id, d.file, f.ext)}
                        download
                        className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line px-4 transition-colors hover:border-accent hover:bg-accent-soft"
                      >
                        <span>
                          <span className="font-medium">{FORMAT_LABELS[f.ext]?.name ?? f.ext}</span>
                          <span className="block text-xs text-muted">{FORMAT_LABELS[f.ext]?.hint}</span>
                        </span>
                        <span className="font-mono text-xs text-muted">
                          .{f.ext} · {fmtBytes(f.bytes)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
