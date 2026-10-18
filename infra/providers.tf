# Tokens come from the environment. The Cloudflare token is TF_VAR_cloudflare_api_token rather than
# CLOUDFLARE_API_TOKEN, because wrangler would otherwise pick it up instead of `wrangler login`.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "vercel" {}
