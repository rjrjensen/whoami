# whoami

Source for [ryanjensen.dev](https://ryanjensen.dev), Ryan Jensen's resume site, and for every resume file it serves.

## Layout

| Path | What it is |
| --- | --- |
| `data/resume.yaml` | Single source of truth: experience, skills, education ([JSON Resume](https://jsonresume.org/schema) schema + extensions) |
| `data/variants.yaml` | Resume versions: Complete, Engineering Manager, Lead Engineer |
| `packages/resume` | Builds every version as PDF, Word, Markdown, JSON, and TOML |
| `apps/web` | The site: Next.js on Vercel, statically rendered |
| `infra` | Terraform: Cloudflare DNS, redirects, email routing; Vercel project and domains |
| `docs` | Site plan and the testimonial form spec |

## Common tasks

```sh
npm install
npm run downloads   # rebuild the site's resume files + content from data/ (PDF needs LibreOffice)
npm run dev         # local site at http://localhost:3000
npm run handouts    # resume files for handing out directly, in dist/ (gitignored)
```

After editing `data/`, run `npm run downloads` and commit the regenerated files in `apps/web/public/downloads` and `apps/web/src/content`.

## Quality checks

CI runs on every push and pull request:
- ESLint and a TypeScript check
- A production build
- An axe accessibility scan (WCAG 2.2 AA) of every page, in light and dark mode, at phone and desktop widths, which also fails if any page scrolls sideways
- Terraform format and validation

## Analytics

PostHog, set up in `apps/web/src/instrumentation-client.ts`; settings are in `apps/web/src/lib/analytics-config.ts`. No cookies or browser storage, so there's no consent banner. Visitors with Do Not Track or Global Privacy Control on aren't tracked at all. Events go through the same-origin `/rj-relay` rewrite so ad blockers don't drop them.

Analytics only runs on the deployed site. To try it locally, build with `NEXT_PUBLIC_POSTHOG_ENABLE_LOCAL=1`; set `NEXT_PUBLIC_POSTHOG_KEY=""` to turn it off anywhere.

| Event | When | Properties |
| --- | --- | --- |
| `$pageview` | page load and client-side navigation (PostHog built-in) | |
| `resume_download` | a download link is clicked | `variant` (`base`/`manager`/`lead`), `format` (`pdf`, `docx`, …) |
| `version_switch` | the "Viewing as" switcher changes version | `from_variant`, `to_variant` |
| `skill_popover_open` | a skill's "where I used it" popover opens | `skill`, `skill_group` |
| `outbound_link_click` | a link to another site is clicked | `host`, `url` |
| `contact_email_click` | the email link is clicked | |
| `scroll_depth` | each of 25/50/75/100% is reached, once per page | `percent` |

Session replay needs `POSTHOG_MODE = "memory"` in the settings file; the default `"cookieless"` mode can't record (see the comment there).
