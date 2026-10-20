// Checks local setup and deployed Worker secrets. Prints key names and set/unset only, never values.
//   npm run doctor             everything
//   npm run doctor -- --local  skip the Cloudflare checks (no network)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const local = process.argv.includes('--local');
let failed = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
const bad = (msg, fix) => (failed++, console.log(`  ✗ ${msg}${fix ? `\n      → ${fix}` : ''}`));
const section = (name) => console.log(`\n${name}`);
// Without CLOUDFLARE_API_TOKEN, so wrangler uses the login (that clash is reported under Local secrets).
const { CLOUDFLARE_API_TOKEN, ...cleanEnv } = process.env;
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, env: cleanEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// KEY=value lines → { KEY: value, optional }. Keys after a "# Optional" comment are optional.
function envFile(path) {
  const keys = new Map();
  let optional = false;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (/^#\s*Optional/i.test(line)) optional = true;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m) keys.set(m[1], { set: m[2].trim().replace(/^["']|["']$/g, '') !== '', optional });
  }
  return keys;
}

// Compares a gitignored env file against its committed example.
function checkEnv(path, example, how) {
  if (!existsSync(path)) return bad(`${path} is missing`, how);
  const have = envFile(path);
  for (const [key, { optional }] of envFile(example)) {
    if (have.get(key)?.set) ok(`${path}: ${key} set`);
    else if (optional) warn(`${path}: ${key} unset (optional)`);
    else bad(`${path}: ${key} unset`, `fill it in; ${example} says where it comes from`);
  }
}

section('Dependencies');
const lock = 'node_modules/.package-lock.json';
if (!existsSync(lock)) bad('node_modules is missing', 'npm install (at the repo root; it covers every app)');
else if (statSync('package-lock.json').mtimeMs > statSync(lock).mtimeMs) bad('package-lock.json changed since the last install', 'npm install');
else ok('installed and up to date with package-lock.json');

section('Private-data hook');
let hooksPath = '';
try { hooksPath = run('git', ['config', 'core.hooksPath']).trim(); } catch {}
if (hooksPath === '.githooks') ok('pre-commit hook installed');
else bad('pre-commit hook not installed', 'npm install (its prepare script sets core.hooksPath)');
if (existsSync('private/blocklist.txt')) {
  try { console.log(`  ✓ ${run('node', ['scripts/check-private.mjs', '--all']).trim()}`); }
  catch (e) { bad('tracked files contain private terms:'); console.log(e.stderr); }
} else bad('private/blocklist.txt is missing', 'create it: one private term per line (README → Private data)');

section('Local secrets');
for (const app of readdirSync('apps')) {
  const example = `apps/${app}/.dev.vars.example`;
  if (existsSync(example)) checkEnv(`apps/${app}/.dev.vars`, example, `cp ${example} apps/${app}/.dev.vars, then fill it in`);
}
checkEnv('infra/.env', 'infra/.env.example', 'cp infra/.env.example infra/.env, then fill it in (infra/README.md → Local secrets)');
for (const f of ['infra/backend.hcl', 'infra/terraform.tfvars'])
  existsSync(f) ? ok(`${f} present`) : bad(`${f} is missing`, `cp ${f}.example ${f}, then fill it in`);
if (CLOUDFLARE_API_TOKEN)
  bad('CLOUDFLARE_API_TOKEN is set in this shell', 'unset it: wrangler uses it instead of your login. Terraform reads TF_VAR_cloudflare_api_token');
if (!process.env.TF_VAR_cloudflare_api_token) warn('TF_VAR_cloudflare_api_token not in this shell (mise loads infra/.env inside the repo)');

if (local) process.exit(failed ? 1 : 0);

section('Cloudflare');
let loggedIn = false;
try {
  loggedIn = /You are logged in/i.test(run('npx', ['wrangler', 'whoami']));
} catch {}
if (loggedIn) ok('wrangler is logged in');
else bad('wrangler is not logged in', 'npx wrangler login');

// Each wrangler.jsonc lists its secrets in a "// Secrets (wrangler secret put): A, B" comment.
for (const app of readdirSync('apps')) {
  const config = `apps/${app}/wrangler.jsonc`;
  if (!loggedIn || !existsSync(config)) continue;
  const text = readFileSync(config, 'utf8');
  const worker = /"name":\s*"([^"]+)"/.exec(text)[1];
  const want = (/\/\/\s*Secrets \(wrangler secret put\):\s*(.+)/.exec(text)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  let have;
  try {
    const out = run('npx', ['wrangler', 'secret', 'list', '--format', 'json'], `apps/${app}`);
    have = new Set(JSON.parse(out.slice(out.indexOf('['))).map((s) => s.name));
  } catch {
    bad(`${worker}: couldn't list secrets`, `is it deployed? cd apps/${app} && npm run deploy`);
    continue;
  }
  for (const name of want)
    have.has(name) ? ok(`${worker}: ${name} set`) : bad(`${worker}: ${name} unset`, `cd apps/${app} && npx wrangler secret put ${name}`);
}

console.log(failed ? `\n${failed} problem(s).` : '\nAll good.');
process.exit(failed ? 1 : 0);
