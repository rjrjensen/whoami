# Domains whose websites 301-redirect to ryanjensen.dev, keeping the path and query string.
locals {
  redirect_zones = {
    rjrjensen_com       = cloudflare_zone.rjrjensen_com
    cleancodedesign_com = cloudflare_zone.cleancodedesign_com
  }
}

# Proxied placeholder records so Cloudflare receives web traffic and the redirect rule can answer it.
# 192.0.2.1 is a reserved documentation address; requests never reach it.
resource "cloudflare_dns_record" "redirect_apex" {
  for_each = local.redirect_zones
  zone_id  = each.value.id
  name     = each.value.name
  type     = "A"
  content  = "192.0.2.1"
  ttl      = 1
  proxied  = true
  comment  = "Redirect placeholder (managed by Terraform)"
}

resource "cloudflare_dns_record" "redirect_www" {
  for_each = local.redirect_zones
  zone_id  = each.value.id
  name     = "www.${each.value.name}"
  type     = "A"
  content  = "192.0.2.1"
  ttl      = 1
  proxied  = true
  comment  = "Redirect placeholder (managed by Terraform)"
}

resource "cloudflare_ruleset" "redirect_to_ryanjensen_dev" {
  for_each = local.redirect_zones
  zone_id  = each.value.id
  name     = "Redirect to ryanjensen.dev"
  kind     = "zone"
  phase    = "http_request_dynamic_redirect"

  rules = [{
    description = "${each.value.name} and www → ryanjensen.dev"
    expression  = "(http.host in {\"${each.value.name}\" \"www.${each.value.name}\"})"
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

# These resources used to be single-domain; keep any existing state instead of recreating them.
moved {
  from = cloudflare_dns_record.redirect_apex
  to   = cloudflare_dns_record.redirect_apex["rjrjensen_com"]
}

moved {
  from = cloudflare_dns_record.redirect_www
  to   = cloudflare_dns_record.redirect_www["rjrjensen_com"]
}

moved {
  from = cloudflare_ruleset.redirect_to_ryanjensen_dev
  to   = cloudflare_ruleset.redirect_to_ryanjensen_dev["rjrjensen_com"]
}
