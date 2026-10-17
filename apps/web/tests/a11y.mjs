// Accessibility + layout checks against a running site: axe (WCAG 2.2 AA) and no horizontal scroll,
// for every page in light and dark mode at phone and desktop widths. Exits non-zero on any failure.
// Usage: node tests/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const sections = ["", "/experience", "/skills", "/about", "/resume", "/contact"];
const pages = ["", "/manager", "/lead"].flatMap((v) => sections.map((s) => v + s || "/"));
const viewports = { phone: { width: 360, height: 780 }, desktop: { width: 1366, height: 900 } };
let failures = 0;

const browser = await chromium.launch();
for (const path of pages) {
  for (const colorScheme of ["light", "dark"]) {
    for (const [name, viewport] of Object.entries(viewports)) {
      const ctx = await browser.newContext({ viewport, colorScheme, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: "networkidle" });
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const label = `${path} ${colorScheme} ${name}`;
      if (violations.length || overflow) {
        failures++;
        console.error(`✗ ${label}${overflow ? " (horizontal scroll)" : ""}`);
        for (const v of violations) console.error(`    ${v.id} [${v.impact}] ${v.help}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
      } else console.log(`✓ ${label}`);
      await ctx.close();
    }
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
