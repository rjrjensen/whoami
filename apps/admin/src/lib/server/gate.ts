// The deny-by-default gate behind hooks.server.ts, kept free of $app imports so it's unit-tested directly.
import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";
import { allowedId, isPublic, SESSION_COOKIE, validateSession } from "./auth";

/** `bypass` is the local test-only sign-in skip; hooks.server.ts makes it false in every production build. */
export const gate =
  (bypass: (url: URL) => boolean): Handle =>
  async ({ event, resolve }) => {
    const env = event.platform?.env;
    if (!env) return new Response("Missing platform bindings", { status: 500 });
    event.locals.admin = bypass(event.url)
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
