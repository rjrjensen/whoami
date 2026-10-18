# Admin app

Ryan's private tools at `admin.ryanjensen.dev`: answer Fit Check's skill questions, read reports, and watch which skills postings ask for. SvelteKit on Cloudflare Workers, installable on a phone as a PWA. Setup steps are in [`docs/todo.md`](../../docs/todo.md) → *Admin app*.

## Pages

| Page | What it does |
| --- | --- |
| `/` Questions | Every skill Fit Check couldn't confirm, must-haves first, with how often it's been asked. Five answers: I have this (with evidence), Something close I haven't listed, I'm learning it, I don't have it, Not for me. |
| `/reports` | Every run: date, role, company, score, cached, follow-up email (once reports carry one). Each opens the full report, `report_json`, and exactly what was pasted. |
| `/trends` | The share of postings asking for each skill, by month, must vs. nice; rising and falling skills against the previous 3 months, with the number of postings (n) shown so small samples are obvious; whether Ryan has each skill, so in-demand gaps stand out; the industry mix once reports have it. |
| `/skills` | One name per skill. Rename a skill, or move a variant (alias) to another skill to merge or split. |
| `/add` | Run a posting Ryan found. Same check as the public box, saved with `source = 'ryan'`: it counts in trends and adds questions, but sends no push. |

## How it fits together

```
phone ── admin.ryanjensen.dev (this Worker) ──┬── D1 "fit-check" (same database as the API)
                                              └── service binding → fit-check Worker, Admin.checkFromAdmin()
```

- **Data.** It binds the same D1 database as `apps/fit-check`. The schema lives in one place, `apps/fit-check/migrations/` (0003 adds this app's tables).
- **Answers.** An answer is saved in full in `skill_responses`. Answers the Worker already understands (have, learning, not pursuing) are also written to `skill_answers`, which the Worker reads, so new reports use them. "Something close" and "I don't have it" wait in `skill_responses` until the Worker learns them. Adding confirmed skills to `data/resume.yaml` by pull request isn't built yet; those answers show a "will be added to resume.yaml" TODO.
- **Skill names.** `src/lib/skill-names.ts` and `src/lib/server/skills.ts` (`resolveSkills`) are the one place names are matched: tidy the name, look it up in `skill_aliases`, and only match an unseen variant (in code today, Jev later). The match is saved as a new alias, so each variant is matched once. Seeded from `resume.yaml`'s skills and a short alias map.
- **Add posting** calls fit-check through a service binding to its `Admin` entrypoint. It has no public URL, so it needs no Turnstile.

## Sign-in

Only Ryan gets in.
- GitHub OAuth through [Arctic](https://arcticjs.dev), with no scopes. The `state` parameter is checked against a short-lived cookie.
- The allowlist is Ryan's numeric GitHub user ID (`ADMIN_GITHUB_ID` in `wrangler.jsonc`), not his login name, which can change hands.
- Sessions live in D1 (`admin_sessions`, storing only a SHA-256 of the token) and in an HttpOnly, Secure, SameSite=Lax cookie that lasts 30 days. Sign out deletes both.
- Deny by default: `src/hooks.server.ts` sends every request without a session to sign-in, except `/auth/*` and static files. Every load, form action, and endpoint calls `requireAdmin()` again.
- Callback: `/auth/github/callback`. Locally `http://localhost:3101/auth/github/callback`; in production `https://admin.ryanjensen.dev/auth/github/callback`. There are two GitHub OAuth apps, one for each.

## Run it locally

```sh
cp apps/admin/.dev.vars.example apps/admin/.dev.vars   # fill in the local OAuth app's ID and secret
npm run migrate:local -w @ryanjensen/fit-check          # the admin dev server shares fit-check's local D1
npm run seed:local -w @ryanjensen/admin                 # optional: fake reports and questions
npm run dev -w @ryanjensen/admin                        # http://localhost:3101
```

"Add posting" needs the fit-check Worker running too (`npm run dev -w @ryanjensen/fit-check`, with its own `.dev.vars`); the two find each other through Wrangler's local dev registry.

## Checks

```sh
npm run lint -w @ryanjensen/admin
npm run typecheck -w @ryanjensen/admin
npm test -w @ryanjensen/admin
npm run build -w @ryanjensen/admin
```

### Accessibility check

`tests/a11y.mjs` runs axe (WCAG 2.2 AA) and a no-sideways-scroll check on every page, in light and dark mode, at phone and desktop widths. To reach pages without signing in, it uses a **test-only sign-in skip**:

```sh
npm run seed:local -w @ryanjensen/admin
ADMIN_AUTH_BYPASS=1 npm run dev -w @ryanjensen/admin
npm run test:a11y -w @ryanjensen/admin
```

The skip can't be turned on in production. It needs all three of: a Vite dev server (`import.meta.env.DEV` and `$app/env`'s `dev`, which the production build replaces with `false`, so the code is dropped), `ADMIN_AUTH_BYPASS=1` in the dev server's environment (not a Worker var or secret), and a request to `localhost`. It never applies to `/auth/*`.

## Next steps

Not built yet, in Ryan's priority order (2026-10-18):
1. Testimonials: review and approve "Vouch for Ryan" submissions
2. The pull-request bridge that adds confirmed skills to `data/resume.yaml`
3. Contacts: screened contact-form messages (people can email Ryan meanwhile)
4. The job search tracker (Ryan uses Huntr meanwhile)
5. Web Push (ntfy covers pushes)

Industry and seniority filters fill in once the Jev pipeline saves them in reports.
