# Ryan's to-do list

Tasks only Ryan can do (accounts, payments, approvals). Claude keeps this list current; check items off as you go.

## Infrastructure (see `infra/README.md` for details)

- [ ] **Before anything else:** delete the old GitHub Pages records for rjrjensen.com at Squarespace, so nobody can claim `www.rjrjensen.com` in the meantime:
  - the four **A** records on `@`: `185.199.108.15`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - the **CNAME** record on `www` → `rjrjensen.github.io`
  - Leave every **MX** and **TXT** record alone (that's your email).
- [x] Turn off DNSSEC for rjrjensen.com, ryanjensen.dev, and cleancodedesign.com (Squarespace)
- [x] Unlock the domains at Squarespace
- [x] Remove the custom domain from the `rjrjensen.github.io` GitHub Pages site
- [ ] Cloudflare:
  - copy the account ID
  - enable R2 and create the `ryanjensen-tfstate` bucket
  - create an R2 API token
  - create a Terraform API token
- [ ] Vercel: sign in with GitHub, give the Vercel GitHub app access to `rjrjensen/whoami`, and create a token
- [ ] Create `infra/.env`, `infra/backend.hcl`, and `infra/terraform.tfvars`
- [ ] `terraform init -backend-config=backend.hcl && terraform apply`
- [ ] Wait 24 hours after the DNSSEC change, then switch all three domains' nameservers at Squarespace to the ones Terraform printed
- [ ] When the zones show **Active** in Cloudflare, tell Claude so it can verify:
  - email
  - the redirects
  - the live site
- [ ] Transfer all three domains to Cloudflare Registrar (auth codes from Squarespace; pay for one year each)
- [ ] After all three transfers finish: turn DNSSEC back on in Cloudflare, then close the Squarespace account

## Email

- [ ] **Add ryanjensen.dev as a Google Workspace alias domain.** Do this after the ryanjensen.dev zone is Active in Cloudflare. Steps are in `infra/README.md` → *Email at ryanjensen.dev*.
  - Then tell Claude to switch the site's contact address to contact@ryanjensen.dev.

## Content

- [ ] Review the homepage tagline and the numbers strip (drafts)
- [ ] Map skills with no evidence to the jobs where you used them (EF Core, Docker, Kubernetes, Jira, Scrum, Dapper, Concourse CI, and others)
- [ ] Send a Small Improvements feedback request to peers with the public-use disclaimer
- [ ] Gather a handful of photos for the About page
