# Ryan's to-do list

Tasks only Ryan can do (accounts, payments, approvals). Claude keeps this list current; check items off as you go.

## Infrastructure (see `infra/README.md` for details)

- [x] ~~Delete the old GitHub Pages records at Squarespace~~ (no longer needed: the nameservers moved to Cloudflare, which doesn't serve them)
- [x] Turn off DNSSEC for rjrjensen.com, ryanjensen.dev, and cleancodedesign.com (Squarespace)
- [x] Unlock the domains at Squarespace
- [x] Remove the custom domain from the `rjrjensen.github.io` GitHub Pages site
- [x] Cloudflare:
  - copy the account ID
  - enable R2 and create the `ryanjensen-tfstate` bucket
  - create an R2 API token
  - create a Terraform API token
- [x] Vercel: sign in with GitHub, give the Vercel GitHub app access to `rjrjensen/whoami`, and create a token
- [x] Create `infra/.env`, `infra/backend.hcl`, and `infra/terraform.tfvars`
- [x] `terraform init -backend-config=backend.hcl && terraform apply`
- [x] Wait 24 hours after the DNSSEC change, then switch all three domains' nameservers at Squarespace to the ones Terraform printed
- [x] When the zones show **Active** in Cloudflare, tell Claude so it can verify:
  - email
  - the redirects
  - the live site
- [x] Transfer all three domains to Cloudflare Registrar (auth codes from Squarespace; pay for one year each)
- [ ] After all three transfers finish: turn DNSSEC back on in Cloudflare, then close the Squarespace account

## Email

- [x] **Add ryanjensen.dev as a Google Workspace alias domain.** Do this after the ryanjensen.dev zone is Active in Cloudflare. Steps are in `infra/README.md` → *Email at ryanjensen.dev*.
- [x] Confirm DKIM for ryanjensen.dev shows **Authenticating email** in Admin (*Apps → Google Workspace → Gmail → Authenticate email*). Can take up to 48 hours.
- [x] Add `hello@ryanjensen.dev` as an alternate email on your user, and add it in Gmail under *Send mail as*.
  - Then tell Claude to switch the site's contact address to hello@ryanjensen.dev.

## Analytics (PostHog)

- [x] Confirm the project is on **US** cloud (the URL starts with `us.posthog.com`). If it's EU, tell Claude, because the region is one setting in `apps/web/src/lib/analytics-config.ts`.
- [x] Project settings → turn on **cookieless server hash mode**; without it, PostHog ignores every event the site sends.
- [x] Project settings → **Authorized URLs**: add `https://ryanjensen.dev`.
- [x] Session replay: skipped in favor of cookieless mode, click capture, and heatmaps.
- [ ] Project settings → **Autocapture**: make sure **Enable autocapture for web** is on; if it's off there, PostHog skips click capture even though the site asks for it.
- [ ] Put `?ref=` tracking links on your profiles (e.g. `https://ryanjensen.dev/?ref=linkedin`, `?ref=github`) and use `?ref=<company>` for links you send recruiters. See README → Analytics.

## Fit Check (see `docs/fit-check.md`)

Until these are done, the Fit Check box shows on the site but every check fails with "Something went wrong."

- [ ] Get a Claude API key at console.anthropic.com (Settings → API keys) and add a few dollars of credit. Set a monthly spend limit there too (Settings → Limits).
- [ ] Add **D1: Edit** and **Turnstile: Edit** (account-level) to the Cloudflare Terraform API token.
- [ ] `terraform apply` in `infra/`: creates the D1 database, the Turnstile widget, and the site key on Vercel.
- [ ] Paste `terraform output fit_check_d1_id` into `apps/fit-check/wrangler.jsonc` → `database_id`, and tell Claude (or commit it).
- [ ] In `apps/fit-check/`:
  - `npx wrangler login`
  - `npm run migrate:remote`
  - `npx wrangler secret put ANTHROPIC_API_KEY`
  - `npx wrangler secret put JEV_API_KEY`
  - `npx wrangler secret put IP_HASH_SALT` (any long random string, e.g. from `openssl rand -hex 32`)
  - `terraform -chdir=../../infra output -raw fit_check_turnstile_secret | npx wrangler secret put TURNSTILE_SECRET_KEY`
  - `npx wrangler secret put NTFY_TOPIC` (an unguessable name, e.g. `fitcheck-` plus `openssl rand -hex 12`)
  - `npm run deploy` (this also creates `api.ryanjensen.dev`)
- [ ] Install **ntfy** from the App Store. Pick the one whose developer is Philipp Heckel; the others are unofficial. Subscribe to that same topic on the default server, ntfy.sh. Unconfirmed must-haves push there.
- [ ] Redeploy the site on Vercel so it picks up `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] Try it with a real job description, then tell Claude how the report reads.

## Admin app (see `apps/admin/README.md`)

Do these after the Fit Check steps above (the admin app uses the same D1 database). In order:

- [ ] Create two GitHub OAuth apps (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App):
  - **Local:** homepage `http://localhost:3101`, callback `http://localhost:3101/auth/github/callback`
  - **Production:** homepage `https://admin.ryanjensen.dev`, callback `https://admin.ryanjensen.dev/auth/github/callback`
  - For each, generate a client secret.
- [ ] Local: copy `apps/admin/.dev.vars.example` to `apps/admin/.dev.vars` and fill in the **local** app's client ID and secret.
- [ ] Check that `ADMIN_GITHUB_ID` in `apps/admin/wrangler.jsonc` is your GitHub user ID (`gh api user --jq .id`). Claude set it from that command.
- [ ] Paste the same `database_id` you used for fit-check into `apps/admin/wrangler.jsonc`.
- [ ] In `apps/fit-check/`:
  - `npm run migrate:remote` (applies `0003_admin.sql`: sessions, skill answers, skill names, `source`)
  - `npm run deploy` (the admin app's "Add posting" calls fit-check's new `Admin` entrypoint, so fit-check goes first)
- [ ] In `apps/admin/`:
  - `npx wrangler secret put GITHUB_CLIENT_ID` (the **production** app's)
  - `npx wrangler secret put GITHUB_CLIENT_SECRET`
  - `npm run deploy` (this also creates `admin.ryanjensen.dev` through `routes` with `custom_domain: true`)
- [ ] Open `https://admin.ryanjensen.dev` on your phone, sign in, and add it to the home screen (Share → Add to Home Screen).
- [ ] Try "Add posting" with a real posting and answer one skill question.

## Content

- [ ] Review the homepage tagline and the numbers strip (drafts)
- [ ] Map skills with no evidence to the jobs where you used them (EF Core, Docker, Kubernetes, Jira, Scrum, Dapper, Concourse CI, and others)
- [ ] Send a Small Improvements feedback request to peers with the public-use disclaimer
- [ ] Gather a handful of photos for the About page
