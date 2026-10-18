// Accessibility + layout checks against a running site: axe (WCAG 2.2 AA) and no horizontal scroll,
// for every page in light and dark mode at phone and desktop widths. The Fit Check API is stubbed with
// tests/fixtures/fit-report.json: "fit-check flow" submits the box on Home and checks the report it opens.
// Exits non-zero on any failure.
// Usage: node tests/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const fitReport = readFileSync(new URL("./fixtures/fit-report.json", import.meta.url), "utf8");

const base = process.argv[2] ?? "http://localhost:3000";
const FIT_CHECK_API = "https://api.ryanjensen.dev/fit-check";
const sections = ["", "/experience", "/skills", "/about", "/resume", "/contact"];
const pages = [...["", "/manager", "/lead"].flatMap((v) => sections.map((s) => v + s || "/")), "/fit-check", "fit-check flow"];
const viewports = { phone: { width: 360, height: 780 }, desktop: { width: 1366, height: 900 } };
let failures = 0;

const browser = await chromium.launch();
for (const path of pages) {
  for (const colorScheme of ["light", "dark"]) {
    for (const [name, viewport] of Object.entries(viewports)) {
      const ctx = await browser.newContext({ viewport, colorScheme, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      if (path === "fit-check flow") {
        await page.route(`${FIT_CHECK_API}**`, (route) => route.fulfill({ contentType: "application/json", body: fitReport }));
        await page.goto(base + "/manager", { waitUntil: "networkidle" });
        await page.fill("#fit-check-jd", "Requirements: ".repeat(20));
        await page.click("#fit-check button[data-track=fit_check_submit]");
        await page.waitForURL(/\/fit-check\?id=[0-9a-f-]{36}&from=manager$/);
        await page.waitForSelector("#fit-report-title");
      } else await page.goto(base + path, { waitUntil: "networkidle" });
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
