# whoami

Source for [ryanjensen.dev](https://ryanjensen.dev), Ryan Jensen's resume site, and for every resume file it serves.

## Layout

| Path | What it is |
| --- | --- |
| `data/resume.yaml` | Single source of truth: experience, skills, education ([JSON Resume](https://jsonresume.org/schema) schema + extensions) |
| `data/variants.yaml` | Resume versions: Complete, Engineering Manager, Lead Engineer |
| `packages/resume` | Builds every version as PDF, Word, Markdown, JSON, and TOML |
| `apps/web` | The site: Next.js on Vercel, statically rendered |
| `apps/fit-check` | The Fit Check API: a Cloudflare Worker with D1 at `api.ryanjensen.dev` ([design](docs/fit-check.md)) |
| `apps/admin` | Ryan's private admin app: SvelteKit on Cloudflare at `admin.ryanjensen.dev` ([details](apps/admin/README.md)) |
| `infra` | Terraform: Cloudflare DNS, redirects, email routing; Vercel project and domains |
| `docs` | Site plan, the Fit Check design, and the testimonial form spec |

## Common tasks

```sh
npm install
npm run downloads   # rebuild the site's resume files + content from data/ (PDF needs LibreOffice)
npm run dev         # local site at http://localhost:3000
npm run handouts    # resume files for handing out directly, in dist/ (gitignored)
```

To run Fit Check locally, copy `apps/fit-check/.dev.vars.example` to `.dev.vars` and fill in the keys, then:

```sh
npm run migrate:local -w @ryanjensen/fit-check
npm run dev -w @ryanjensen/fit-check   # API at http://localhost:8787/fit-check
NEXT_PUBLIC_FIT_CHECK_URL=http://localhost:8787/fit-check npm run dev
```

After editing `data/`, run `npm run downloads` and commit the regenerated files in `apps/web/public/downloads`, `apps/web/src/content`, and `apps/fit-check/src/record.json`.

## Setup checks

```sh
npm run doctor            # dependencies, .dev.vars keys, Worker secrets, logins, the hook
npm run doctor -- --local # the same without the Cloudflare checks
npm run worktree:link     # in a new worktree: link the secret files from the main checkout
```

The doctor prints key names and set/unset only, never values. Each Worker's expected secrets come from the `// Secrets (wrangler secret put): …` comment in its `wrangler.jsonc`, so add new secrets there.

## Private data

Some things never go in this public repo: Ryan's phone number, his salary targets, the ntfy topic, and the names of Source Allies clients. They're listed one per line in `private/blocklist.txt`, which is gitignored (`#` starts a comment). Matching ignores case, and a phone number matches with any separators.

`npm install` installs a pre-commit hook that rejects any commit adding one of those terms. It reports the file, the line, and which blocklist entry matched, but not the term itself. `npm run check:private` scans every tracked file the same way. CI can't run this check because the list isn't in the repo.

## Quality checks

CI runs on every push and pull request:
- ESLint and a TypeScript check
- Fit Check: a TypeScript check, unit tests, and a Worker bundle
- Admin app: ESLint, svelte-check, unit tests, a build, and the same axe scan against a dev server with fake data
- A production build
- An axe accessibility scan (WCAG 2.2 AA) of every page, in light and dark mode, at phone and desktop widths, which also fails if any page scrolls sideways
- Terraform format and validation

## Deploys

- **Site:** Vercel deploys every push (previews for PRs, production for `main`).
- **Workers:** after every check passes on `main`, the `deploy` job applies new D1 migrations, then deploys fit-check, then admin. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets (`docs/todo.md` → Automatic Worker deploys). Worker secrets live in Cloudflare and are set with `wrangler secret put`.
- **Infrastructure:** Terraform in `infra/`, applied by hand.

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
| `page_turn` | the next/previous arrow at the bottom of a page is clicked, or the ← / → key is pressed | `from_page`, `to_page`, `direction` (`forward`/`back`), `method` (`click`/`keyboard`) |
| `fit_check_submit` | the Fit Check button is clicked | |
| `fit_check_result` | a Fit Check finishes, just before its report opens at `/fit-check` | `score`, `label`, `requirements`, `matcher` (`jev`/`claude`), `cached`, `recommended` (version) |
| `fit_check_error` | a Fit Check fails | `error` (e.g. `rate_limited`, `not_a_job_description`, `resting`, `network`) |
| `scroll_depth` | each of 25/50/75/100% is reached, once per page | `percent` |
| `$autocapture` | any click on a link, button, or other interactive element (PostHog built-in, clicks only) | element details |
| `$dead_click`, `$rageclick` | a click that changed nothing, or repeated clicks in one spot (PostHog built-in) | element details |
| `$pageleave` | the visitor leaves a page; PostHog uses it for time on page (built-in) | |

Heatmaps are recorded too; view them from PostHog's toolbar on ryanjensen.dev.

**Tracking links.** Add `?ref=<source>` to any link to the site, e.g. `https://ryanjensen.dev/?ref=linkedin` on a profile or `?ref=acme` for one company's recruiter. Every event from that visit carries `ref`. Use short lowercase names for platforms and companies, not people. PostHog's standard `utm_source`/`utm_campaign` parameters work as well.

**Keep the hooks when changing the layout.** The custom events come from `data-track`, `data-variant`/`data-format`, `data-from`/`data-to`/`data-direction`/`data-key-turn`, and `data-skill`/`data-skill-group` attributes, read by delegated listeners. Moved or redesigned elements keep reporting as long as they keep those attributes, and new pages are tracked automatically. In PostHog, define actions on those attributes rather than CSS classes or button text.

Session replay needs `POSTHOG_MODE = "memory"` in the settings file; the default `"cookieless"` mode can't record (see the comment there).
