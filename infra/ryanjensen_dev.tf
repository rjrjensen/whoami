# ryanjensen.dev: the site, served by Vercel. Records are DNS-only (not proxied) so Vercel can issue certificates.

resource "cloudflare_dns_record" "site_apex" {
  zone_id = cloudflare_zone.ryanjensen_dev.id
  name    = "ryanjensen.dev"
  type    = "A"
  content = "76.76.21.21"
  ttl     = 1
  proxied = false
  comment = "Vercel (managed by Terraform)"
}

resource "cloudflare_dns_record" "site_www" {
  zone_id = cloudflare_zone.ryanjensen_dev.id
  name    = "www.ryanjensen.dev"
  type    = "CNAME"
  content = "cname.vercel-dns.com"
  ttl     = 1
  proxied = false
  comment = "Vercel (managed by Terraform)"
}

# Email Routing replaces the Squarespace (Mailgun) forwarding: anything@ryanjensen.dev goes to var.email_forward_to.
# Cloudflare adds its own MX/SPF records when routing is enabled. The destination must click a verification email once.
resource "cloudflare_email_routing_address" "inbox" {
  count      = var.email_forward_to == "" ? 0 : 1
  account_id = var.cloudflare_account_id
  email      = var.email_forward_to
}

resource "cloudflare_email_routing_settings" "ryanjensen_dev" {
  count   = var.email_forward_to == "" ? 0 : 1
  zone_id = cloudflare_zone.ryanjensen_dev.id
}

resource "cloudflare_email_routing_catch_all" "ryanjensen_dev" {
  count    = var.email_forward_to == "" ? 0 : 1
  zone_id  = cloudflare_zone.ryanjensen_dev.id
  name     = "Forward everything"
  enabled  = true
  matchers = [{ type = "all" }]
  actions  = [{ type = "forward", value = [var.email_forward_to] }]

  depends_on = [cloudflare_email_routing_settings.ryanjensen_dev]
}
