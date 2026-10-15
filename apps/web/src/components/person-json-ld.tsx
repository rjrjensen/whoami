import type { Variant } from "@/lib/resume";

// schema.org Person data so search engines can describe Ryan accurately.
export function PersonJsonLd({ variant }: { variant: Variant }) {
  const { basics } = variant;
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: basics.name,
    jobTitle: basics.label,
    url: basics.url,
    email: `mailto:${basics.email}`,
    address: { "@type": "PostalAddress", addressLocality: basics.location.city, addressRegion: basics.location.region, addressCountry: "US" },
    sameAs: basics.profiles.map((p) => p.url),
    worksFor: variant.work.filter((w) => !w.endDate).map((w) => ({ "@type": "Organization", name: w.name })),
    alumniOf: variant.education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.institution })),
    knowsAbout: variant.skills.flatMap((s) => s.keywords.map((k) => k.name)),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
