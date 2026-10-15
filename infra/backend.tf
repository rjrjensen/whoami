# State lives in a Cloudflare R2 bucket (S3-compatible). The bucket is created once by hand; see README.md.
# Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (an R2 API token), and the endpoint from
# backend.hcl (gitignored), so the account ID stays out of the repo: terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {
    bucket = "ryanjensen-tfstate"
    key    = "site/terraform.tfstate"
    region = "auto"

    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
