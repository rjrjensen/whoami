terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.21"
    }
  }
}
