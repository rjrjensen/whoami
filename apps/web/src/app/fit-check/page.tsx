import type { Metadata } from "next";
import Link from "next/link";
import { FitCheckForm, FitCheckReport } from "@/components/fit-check";

export const metadata: Metadata = {
  title: "Fit Check",
  description: "Paste a job description and see, requirement by requirement, how Ryan Jensen's experience lines up.",
};

export default function FitCheckPage() {
  return (
    <>
      <main id="main" className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-signal">Fit Check</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">Do I fit your role?</h1>
        <p className="mt-3">
          <Link href="/" className="text-accent underline-offset-4 hover:underline">
            Back to the resume
          </Link>
        </p>
        <div className="mt-8">
          <FitCheckReport />
        </div>
        <section aria-labelledby="fit-check-again" className="mt-16">
          <h2 id="fit-check-again" className="font-display text-3xl">
            Check a role
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Paste a job description to see how my experience lines up, requirement by requirement. This page&rsquo;s address links back to the
            report, so you can bookmark or share it.
          </p>
          <div className="mt-6">
            <FitCheckForm variant="base" />
          </div>
        </section>
      </main>
    </>
  );
}
