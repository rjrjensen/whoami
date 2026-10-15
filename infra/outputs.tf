output "nameservers" {
  description = "Set these as the nameservers for each domain at Squarespace (before transferring the registration)."
  value = {
    "ryanjensen.dev" = cloudflare_zone.ryanjensen_dev.name_servers
    "rjrjensen.com"  = cloudflare_zone.rjrjensen_com.name_servers
  }
}

output "vercel_project_id" {
  value = vercel_project.site.id
}
