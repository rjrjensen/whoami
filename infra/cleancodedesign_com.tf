# cleancodedesign.com: no mail, so these records tell other mail servers to reject anything claiming to be
# from this domain (stops spammers from spoofing it). The website redirect is in redirects.tf.

resource "cloudflare_dns_record" "ccd_null_mx" {
  zone_id  = cloudflare_zone.cleancodedesign_com.id
  name     = "cleancodedesign.com"
  type     = "MX"
  content  = "."
  priority = 0
  ttl      = 1
  comment  = "Null MX: domain accepts no mail (managed by Terraform)"
}

resource "cloudflare_dns_record" "ccd_spf" {
  zone_id = cloudflare_zone.cleancodedesign_com.id
  name    = "cleancodedesign.com"
  type    = "TXT"
  content = "\"v=spf1 -all\""
  ttl     = 1
  comment = "Domain sends no mail (managed by Terraform)"
}

resource "cloudflare_dns_record" "ccd_dmarc" {
  zone_id = cloudflare_zone.cleancodedesign_com.id
  name    = "_dmarc.cleancodedesign.com"
  type    = "TXT"
  content = "\"v=DMARC1; p=reject\""
  ttl     = 1
  comment = "Reject spoofed mail (managed by Terraform)"
}
