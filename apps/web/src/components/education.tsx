import type { Variant } from "@/lib/resume";

export function Education({ variant: v }: { variant: Variant }) {
  return (
    <section id="education" aria-labelledby="education-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 id="education-title" className="font-display text-4xl sm:text-5xl">
        Education &amp; certifications
      </h1>
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
  );
}
