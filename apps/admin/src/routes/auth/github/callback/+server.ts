// GitHub sends Ryan back here. Only the allowlisted GitHub ID gets a session; anyone else gets a 403.
import { error, redirect } from "@sveltejs/kit";
import { allowedId, finishSignIn, setSessionCookie, STATE_COOKIE } from "#lib/server/auth.ts";
import { githubClient } from "#lib/server/github.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  const env = platform!.env;
  const storedState = cookies.get(STATE_COOKIE);
  cookies.delete(STATE_COOKIE, { path: "/auth/github" });
  const result = await finishSignIn({ code: url.searchParams.get("code"), state: url.searchParams.get("state"), storedState }, githubClient(env), env.DB, allowedId(env));
  if (result.status === 400) error(400, "Sign-in didn't complete. Start again from the sign-in page.");
  if (result.status === 403) error(403, "This GitHub account isn't allowed here.");
  setSessionCookie(cookies, result.token, result.expiresAt);
  redirect(303, "/");
};
