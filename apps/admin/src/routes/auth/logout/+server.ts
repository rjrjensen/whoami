// Sign out: deletes the session row and the cookie. POST only; SvelteKit's origin check stops cross-site posts.
import { env } from "cloudflare:workers";
import { redirect } from "@sveltejs/kit";
import { deleteSession, SESSION_COOKIE } from "#lib/server/auth.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ cookies }) => {
  await deleteSession(env.DB, cookies.get(SESSION_COOKIE));
  cookies.delete(SESSION_COOKIE, { path: "/" });
  redirect(303, "/auth/login");
};
