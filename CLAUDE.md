# whoami

Ryan's resume site (ryanjensen.dev), the Fit Check API, and his private admin app. The layout table and common commands are in `README.md`; open setup tasks are in `docs/todo.md`.

## Guardrails

- **Private data stays out of the repo and out of public pages:** Ryan's phone number, his salary targets, the ntfy topic, and the names of Source Allies clients. Describe a client instead ("a regional mutual insurer"). The pre-commit hook blocks the terms listed in `private/blocklist.txt`; when Ryan names a new private term, add it there.
- **Secrets:** show key names and set/unset status only, never values.
- **Ryan runs every command that changes infrastructure or handles a secret value:** `terraform apply`/`import`, `wrangler deploy`, `wrangler secret put`, migrations with `--remote`. Claude may run read-only status checks itself (`terraform plan`, `wrangler whoami`, `wrangler secret list`, `wrangler deployments list`, `npm run doctor`).
- **Facts about Ryan's career come from Ryan.** Ask before adding a metric, date, or detail to `data/resume.yaml`.
- **Generated files** (`apps/web/public/downloads`, `apps/web/src/content`, `apps/fit-check/src/record.json`) come from `data/`. Edit `data/`, then run `npm run downloads`.

## Workflow

- `main` takes rebase merges only, with linear history. Branch from `main`, keep PRs small, and merge one before starting work that depends on it (no stacked PRs).
- At most one worktree at a time. Run `npm run worktree:link` in a new worktree to link the gitignored secret files from the main checkout.
- `npm run doctor` checks dependencies, `.dev.vars` keys, Worker secrets, logins, and the hook. Run it first when a deploy or dev server fails.
- PR bodies use the `/pr` skill template.
