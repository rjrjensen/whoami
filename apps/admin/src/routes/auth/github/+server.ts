// Starts GitHub sign-in. The state cookie is checked in the callback.
import { env } from "cloudflare:workers";
import { redirect } from "@sveltejs/kit";
import { STATE_COOKIE } from "#lib/server/auth.ts";
import { authorizationURL } from "#lib/server/github.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ cookies }) => {
  const { state, url } = authorizationURL(env);
  cookies.set(STATE_COOKIE, state, { path: "/auth/github", httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
  redirect(302, url, { external: ["https://github.com"] });
};
