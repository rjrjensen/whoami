// GitHub OAuth through Arctic. No scopes: reading the signed-in user's public profile (its ID) needs none.
import { GitHub, generateState } from "arctic";
import type { GitHubClient } from "./auth";

export const CALLBACK_PATH = "/auth/github/callback";

const github = (env: Env) => new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, `${env.ORIGIN}${CALLBACK_PATH}`);

export function authorizationURL(env: Env) {
  const state = generateState();
  return { state, url: github(env).createAuthorizationURL(state, []) };
}

export const githubClient = (env: Env): GitHubClient => ({
  exchange: async (code) => (await github(env).validateAuthorizationCode(code)).accessToken(),
  userId: async (accessToken) => {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "ryanjensen-admin" },
    });
    if (!res.ok) throw new Error(`GitHub /user returned ${res.status}`);
    return ((await res.json()) as { id: number }).id;
  },
});
