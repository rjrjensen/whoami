variable "cloudflare_account_id" {
  description = "Cloudflare account ID (dashboard → any domain → Overview → API section)."
  type        = string
}

variable "github_repo" {
  description = "GitHub repo that Vercel deploys from, as owner/name."
  type        = string
  default     = "rjrjensen/ryanjensen.dev"
}

variable "email_forward_to" {
  description = "Inbox that mail sent to any address at ryanjensen.dev is forwarded to. Leave empty to skip email routing."
  type        = string
  default     = ""
}
