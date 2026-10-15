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

# Email: ryanjensen.dev is a Google Workspace alias domain, so contact@ryanjensen.dev (and any alias) lands in
# ryan@rjrjensen.com's inbox and Gmail can reply from it. Add the domain in Workspace Admin first; it gives
# the verification token and DKIM key that go in terraform.tfvars.

resource "cloudflare_dns_record" "site_google_mx" {
  for_each = local.google_mx
  zone_id  = cloudflare_zone.ryanjensen_dev.id
  name     = "ryanjensen.dev"
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 1
  comment  = "Google Workspace mail (managed by Terraform)"
}

resource "cloudflare_dns_record" "site_spf" {
  zone_id = cloudflare_zone.ryanjensen_dev.id
  name    = "ryanjensen.dev"
  type    = "TXT"
  content = "\"v=spf1 include:_spf.google.com ~all\""
  ttl     = 1
  comment = "Google Workspace SPF (managed by Terraform)"
}

resource "cloudflare_dns_record" "site_google_verification" {
  count   = var.ryanjensen_dev_google_verification == "" ? 0 : 1
  zone_id = cloudflare_zone.ryanjensen_dev.id
  name    = "ryanjensen.dev"
  type    = "TXT"
  content = "\"${var.ryanjensen_dev_google_verification}\""
  ttl     = 1
  comment = "Google Workspace domain verification (managed by Terraform)"
}

resource "cloudflare_dns_record" "site_google_dkim" {
  count   = var.ryanjensen_dev_google_dkim == "" ? 0 : 1
  zone_id = cloudflare_zone.ryanjensen_dev.id
  name    = "google._domainkey.ryanjensen.dev"
  type    = "TXT"
  content = var.ryanjensen_dev_google_dkim
  ttl     = 1
  comment = "Google Workspace DKIM (managed by Terraform)"
}
