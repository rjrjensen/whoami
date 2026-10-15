# Vercel project for the Next.js site in apps/web. Requires the Vercel GitHub app to have access to the repo.

resource "vercel_project" "site" {
  name           = "ryanjensen-dev"
  framework      = "nextjs"
  root_directory = "apps/web"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = "main"
  }
}

resource "vercel_project_domain" "apex" {
  project_id = vercel_project.site.id
  domain     = "ryanjensen.dev"
}

resource "vercel_project_domain" "www" {
  project_id           = vercel_project.site.id
  domain               = "www.ryanjensen.dev"
  redirect             = vercel_project_domain.apex.domain
  redirect_status_code = 308
}
