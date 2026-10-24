// Accessibility + layout checks against a running admin dev server: axe (WCAG 2.2 AA) and no horizontal scroll,
// for every page in light and dark mode at phone and desktop widths. Same checks as apps/web/tests/a11y.mjs.
// The server must run with the test-only sign-in skip and fake data (see apps/admin/README.md → Accessibility check):
//   npm run seed:local && ADMIN_AUTH_BYPASS=1 npm run dev
// Exits non-zero on any failure.
// Usage: node tests/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = process.argv[2] ?? "http://localhost:3101";
const FAKE_REPORT = "/reports/00000000-0000-4000-8000-000000000000";
const pages = ["/", "/reports", FAKE_REPORT, "/trends", "/skills", "/resume", "/add", "/auth/login", "add posting error", "answer form open"];
const viewports = { phone: { width: 360, height: 780 }, desktop: { width: 1366, height: 900 } };
let failures = 0;

const browser = await chromium.launch();
for (const path of pages) {
  for (const colorScheme of ["light", "dark"]) {
    for (const [name, viewport] of Object.entries(viewports)) {
      const ctx = await browser.newContext({ viewport, colorScheme, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      if (path === "add posting error") {
        // The Admin RPC isn't running locally, so this shows the add page's error state.
        await page.goto(base + "/add", { waitUntil: "networkidle" });
        await page.fill("#posting", "Too short");
        await page.click("main form button[type=submit]");
        await page.waitForSelector("#posting-error");
      } else if (path === "answer form open") {
        await page.goto(base + "/", { waitUntil: "networkidle" });
        const first = page.locator("input[type=radio][value=have]").first();
        if (await first.count()) await first.check();
      } else {
        const res = await page.goto(base + path, { waitUntil: "networkidle" });
        if (!res?.ok()) {
          failures++;
          console.error(`✗ ${path} ${colorScheme} ${name} (HTTP ${res?.status()})`);
          await ctx.close();
          continue;
        }
      }
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
