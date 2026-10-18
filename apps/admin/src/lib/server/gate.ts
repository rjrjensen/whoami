// The deny-by-default gate behind hooks.server.ts, kept free of $app imports so it's unit-tested directly.
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";
import { allowedId, isPublic, SESSION_COOKIE, validateSession } from "./auth";

/**
 * `env` is the Worker's bindings (from cloudflare:workers, passed in so tests can fake them).
 * `bypass` is the local test-only sign-in skip; hooks.server.ts makes it false in every production build.
 */
export const gate =
  (env: Env, bypass: (url: URL) => boolean): Handle =>
  async ({ event, resolve }) => {
    // The bypass never applies to /auth/*, so the sign-in page can still be checked.
    event.locals.admin = bypass(event.url) && !isPublic(event.url.pathname)
      ? { githubId: allowedId(env) }
      : await validateSession(env.DB, event.cookies.get(SESSION_COOKIE), allowedId(env));

    if (!event.locals.admin && !isPublic(event.url.pathname)) {
      const page = event.request.method === "GET" && event.request.headers.get("accept")?.includes("text/html");
      if (page) redirect(303, "/auth/login");
      return new Response("Sign in first.", { status: 401 });
    }

    const response = await resolve(event);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "same-origin");
    if (!isPublic(event.url.pathname) || event.url.pathname.startsWith("/auth/")) response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
