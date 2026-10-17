import type { Variant } from "@/lib/resume";

export function Contact({ variant: v }: { variant: Variant }) {
  const { basics } = v;
  const github = basics.profiles.find((p) => p.network === "GitHub");
  const linkedin = basics.profiles.find((p) => p.network === "LinkedIn");

  return (
    <section id="contact" aria-labelledby="contact-title" className="bg-accent text-accent-ink">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h1 id="contact-title" className="font-display text-5xl sm:text-6xl">
          Let&rsquo;s connect.
        </h1>
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
  );
}
