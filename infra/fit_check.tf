# Fit Check (apps/fit-check): the D1 database and the Turnstile widget. The Worker itself, its
# api.ryanjensen.dev custom domain, and its secrets are deployed with wrangler (see docs/todo.md → Fit Check).

resource "cloudflare_d1_database" "fit_check" {
  account_id = var.cloudflare_account_id
  name       = "fit-check"
  # Pinned to North America, where nearly every visitor is.
  primary_location_hint = "enam"
}

resource "cloudflare_turnstile_widget" "fit_check" {
  account_id = var.cloudflare_account_id
  name       = "ryanjensen.dev Fit Check"
  domains    = ["ryanjensen.dev", "www.ryanjensen.dev"]
  # Invisible for most visitors; shows a checkbox only when Cloudflare is unsure.
  mode = "managed"
}

# The site key is public by design; the secret goes to the Worker with `wrangler secret put TURNSTILE_SECRET_KEY`.
resource "vercel_project_environment_variable" "turnstile_site_key" {
  project_id = vercel_project.site.id
  key        = "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
  value      = cloudflare_turnstile_widget.fit_check.sitekey
  target     = ["production", "preview"]
  sensitive  = false
}

output "fit_check_d1_id" {
  description = "Paste into apps/fit-check/wrangler.jsonc → d1_databases[0].database_id."
  value       = cloudflare_d1_database.fit_check.uuid
}

output "fit_check_turnstile_secret" {
  description = "terraform output -raw fit_check_turnstile_secret | npx wrangler secret put TURNSTILE_SECRET_KEY"
  value       = cloudflare_turnstile_widget.fit_check.secret
  sensitive   = true
}
