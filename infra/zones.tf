resource "cloudflare_zone" "ryanjensen_dev" {
  account = { id = var.cloudflare_account_id }
  name    = "ryanjensen.dev"
  type    = "full"
}

resource "cloudflare_zone" "rjrjensen_com" {
  account = { id = var.cloudflare_account_id }
  name    = "rjrjensen.com"
  type    = "full"
}
