variable "cloudflare_account_id" {
  description = "Cloudflare account ID (dashboard → any domain → Overview → API section)."
  type        = string
}

variable "github_repo" {
  description = "GitHub repo that Vercel deploys from, as owner/name."
  type        = string
  default     = "rjrjensen/whoami"
}

variable "ryanjensen_dev_google_verification" {
  description = "TXT verification value from Google Workspace Admin when adding ryanjensen.dev as an alias domain (google-site-verification=...)."
  type        = string
  default     = ""
}

variable "ryanjensen_dev_google_dkim" {
  description = "DKIM TXT value from Google Workspace Admin for ryanjensen.dev (Apps → Gmail → Authenticate email). Paste it as Google shows it."
  type        = string
  default     = ""
}
