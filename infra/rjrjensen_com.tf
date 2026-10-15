# rjrjensen.com: Google Workspace email stays exactly as it is; the website redirects to ryanjensen.dev.

locals {
  google_mx = {
    "aspmx.l.google.com"      = 1
    "alt1.aspmx.l.google.com" = 5
    "alt2.aspmx.l.google.com" = 5
    "alt3.aspmx.l.google.com" = 10
    "alt4.aspmx.l.google.com" = 10
  }

  # Copied from the Squarespace zone on 2026-10-15. The DKIM key is split into 255-character strings as published.
  google_dkim = join(" ", [
    "\"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoM/zXcPHKbvnPXbwnTT4I9hslMxopGzUmy4wgyMvt6cMwi4v5Jg1kzeH+GiUPV9c3bSEqGOhXG0QXkr9UeYLXYPvaKGuqJWouoxNJm2KoPeM+WfMD3M+O3mZTHkUEEmktau6nunIsvC\"",
    "\"HpbQE4i//5ExyvdXnKpS3LUx4i1+Hkvy/aN+HeZDOhO+hXHVJQZpzcUFOSc8fU5IbM0vb8gwv1eyyRthF/ux9WC84lYfsYjBELrJf+UMNKrriaUOXBZqo3BE/iRVmLEFOZ+n8qvF3TUhjT6szQrEoyNUd8t427CSi+dTedkx1gdFJ/yeOYfmEBCRnb6Cq8qnhFmbqjBUj\"",
    "\"LwIDAQAB\"",
  ])
}

resource "cloudflare_dns_record" "google_mx" {
  for_each = local.google_mx
  zone_id  = cloudflare_zone.rjrjensen_com.id
  name     = "rjrjensen.com"
  type     = "MX"
  content  = each.key
  priority = each.value
  ttl      = 1
  comment  = "Google Workspace mail (managed by Terraform)"
}

resource "cloudflare_dns_record" "spf" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "rjrjensen.com"
  type    = "TXT"
  content = "\"v=spf1 include:_spf.google.com ~all\""
  ttl     = 1
  comment = "Google Workspace SPF (managed by Terraform)"
}

resource "cloudflare_dns_record" "google_dkim" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "google._domainkey.rjrjensen.com"
  type    = "TXT"
  content = local.google_dkim
  ttl     = 1
  comment = "Google Workspace DKIM (managed by Terraform)"
}

resource "cloudflare_dns_record" "verification" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "rjrjensen.com"
  type    = "TXT"
  content = "\"3b8nw1j0hmjk9rp7jqr816c29599kc57\""
  ttl     = 1
  comment = "Existing verification token, origin unknown; carried over from Squarespace (managed by Terraform)"
}

# Proxied placeholder records so Cloudflare receives web traffic and the redirect rule below can answer it.
# 192.0.2.1 is a reserved documentation address; requests never reach it.
resource "cloudflare_dns_record" "redirect_apex" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "rjrjensen.com"
  type    = "A"
  content = "192.0.2.1"
  ttl     = 1
  proxied = true
  comment = "Redirect placeholder (managed by Terraform)"
}

resource "cloudflare_dns_record" "redirect_www" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "www.rjrjensen.com"
  type    = "A"
  content = "192.0.2.1"
  ttl     = 1
  proxied = true
  comment = "Redirect placeholder (managed by Terraform)"
}

resource "cloudflare_ruleset" "redirect_to_ryanjensen_dev" {
  zone_id = cloudflare_zone.rjrjensen_com.id
  name    = "Redirect to ryanjensen.dev"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"

  rules = [{
    description = "rjrjensen.com and www → ryanjensen.dev, keeping the path and query string"
    expression  = "(http.host in {\"rjrjensen.com\" \"www.rjrjensen.com\"})"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://ryanjensen.dev\", http.request.uri.path)"
        }
      }
    }
  }]
}
