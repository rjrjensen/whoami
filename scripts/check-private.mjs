// Finds private terms (client names, phone, salary, ntfy topic) listed in the gitignored private/blocklist.txt.
//   --staged  lines added in the staged diff (the pre-commit hook)
//   --all     every tracked file
// Reports where a term matched and its line number in the blocklist, never the term itself.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const LIST = 'private/blocklist.txt';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const digits = (s) => s.replace(/\D/g, '');

if (!existsSync(LIST)) {
  console.warn(`check-private: ${LIST} is missing, so nothing was checked. See README → Private data.`);
  process.exit(0);
}

// A term with 7+ digits and nothing but digits and separators (a phone number) also matches with any separators.
const terms = readFileSync(LIST, 'utf8')
  .split('\n')
  .map((text, i) => ({ text: text.trim(), entry: i + 1 }))
  .filter((t) => t.text && !t.text.startsWith('#'))
  .map((t) => ({ ...t, lower: t.text.toLowerCase(), number: /^[\d\s().+-]+$/.test(t.text) && digits(t.text).length >= 7 ? digits(t.text) : null }));

const matches = (line) => {
  const lower = line.toLowerCase();
  const lineDigits = digits(line);
  return terms.filter((t) => lower.includes(t.lower) || (t.number && lineDigits.includes(t.number)));
};

// [file, line number, text] for each line to check.
function stagedLines() {
  const out = [];
  let file, n;
  for (const line of git('diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR').split('\n')) {
    if (line.startsWith('+++ ')) file = line.slice(6);
    else if (line.startsWith('@@')) n = Number(/\+(\d+)/.exec(line)[1]);
    else if (line.startsWith('+')) out.push([file, n++, line.slice(1)]);
  }
  return out;
}
function trackedLines() {
  const out = [];
  for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
    if (!existsSync(file)) continue;
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    buf.toString('utf8').split('\n').forEach((text, i) => out.push([file, i + 1, text]));
  }
  return out;
}

const mode = process.argv[2] ?? '--staged';
const lines = mode === '--all' ? trackedLines() : stagedLines();
const hits = lines.flatMap(([file, n, text]) => matches(text).map((t) => `  ${file}:${n} matches ${LIST} line ${t.entry}`));

if (hits.length) {
  console.error(`check-private: found ${hits.length} private term(s):\n${hits.join('\n')}`);
  console.error('Reword these lines (for a client, describe it: "a regional mutual insurer").');
  process.exit(1);
}
if (mode === '--all') console.log(`check-private: ${terms.length} terms, no matches in tracked files.`);
