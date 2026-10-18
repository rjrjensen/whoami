// Every route needs Ryan's session except /auth/* and static files (see lib/server/gate.ts).
import { env } from "cloudflare:workers";
import { dev } from "$app/env";
import { gate } from "#lib/server/gate.ts";

/**
 * Test-only sign-in skip for the local axe check (tests/a11y.mjs). It needs all of:
 *   - a dev server: `import.meta.env.DEV` and `dev` are replaced with false in production builds, so this is dead code there
 *   - ADMIN_AUTH_BYPASS=1 in the dev server's environment
 *   - a request to localhost
 */
const bypass = (url: URL) =>
  import.meta.env.DEV && dev && typeof process !== "undefined" && process.env.ADMIN_AUTH_BYPASS === "1" && ["localhost", "127.0.0.1"].includes(url.hostname);

export const handle = gate(env, bypass);
