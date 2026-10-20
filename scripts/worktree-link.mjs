// Run inside a new worktree: symlinks the gitignored secret files and private/ from the main checkout,
// so every worktree shares one copy. Skips anything already present.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const main = dirname(resolve(execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim()));
if (main === process.cwd()) {
  console.log('This is the main checkout; nothing to link.');
  process.exit(0);
}

const files = [
  'private',
  'infra/.env',
  'infra/backend.hcl',
  'infra/terraform.tfvars',
  ...readdirSync(`${main}/apps`).map((app) => `apps/${app}/.dev.vars`),
];
for (const f of files) {
  if (!existsSync(`${main}/${f}`)) continue;
  if (existsSync(f)) console.log(`  - ${f} already present`);
  else (symlinkSync(`${main}/${f}`, f), console.log(`  ✓ ${f} → ${main}/${f}`));
}
