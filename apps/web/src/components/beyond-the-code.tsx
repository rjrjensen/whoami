import { site } from "@/lib/resume";

export function BeyondTheCode() {
  const { beyond, projects } = site.about;
  return (
    <section id="beyond" aria-labelledby="beyond-title" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">I&rsquo;m not just a terminal and an IDE</p>
        <h1 id="beyond-title" className="mt-2 font-display text-4xl sm:text-5xl">
          Beyond the code
        </h1>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {beyond.map((b) => (
            <li key={b.title} className="reveal rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-lg font-semibold">{b.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{b.text}</p>
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-mono text-xs uppercase tracking-[0.16em] text-muted">Side projects</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.name} className="reveal rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
              <p className="mt-4 flex flex-wrap gap-x-6">
                <a href={p.url} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
                  {p.linkLabel ?? `Visit ${p.name}`}
                  <span aria-hidden="true">&nbsp;→</span>
                </a>
                {p.source && (
                  <a href={p.source} className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
                    Source on GitHub
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
