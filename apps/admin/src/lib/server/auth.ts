// Sign-in for Ryan only: GitHub OAuth, an allowlist of one numeric GitHub user ID, and 30-day sessions in D1.
// The cookie holds a random token; D1 stores only its SHA-256, so a database leak doesn't leak sessions.
import { error, type Cookies, type RequestEvent } from "@sveltejs/kit";

export const SESSION_COOKIE = "admin_session";
export const STATE_COOKIE = "github_oauth_state";
export const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

export type Admin = NonNullable<App.Locals["admin"]>;

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const newToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!);

// SQLite's datetime() format, so expiry compares against datetime('now') in SQL as well.
const sqlTime = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

export async function createSession(db: D1Database, githubId: number, now = new Date()) {
  const token = newToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
  await db.batch([
    // Expired sessions are cleared whenever a new one starts.
    db.prepare(`DELETE FROM admin_sessions WHERE expires_at <= ?`).bind(sqlTime(now)),
    db.prepare(`INSERT INTO admin_sessions (id, github_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).bind(await sha256(token), githubId, sqlTime(now), sqlTime(expiresAt)),
  ]);
  return { token, expiresAt };
}

/** The session's admin, or null if the token is unknown, expired, or belongs to an ID that's no longer allowed. */
export async function validateSession(db: D1Database, token: string | undefined, allowedId: number, now = new Date()): Promise<Admin | null> {
  if (!token) return null;
  const id = await sha256(token);
  const row = await db.prepare(`SELECT github_id, expires_at FROM admin_sessions WHERE id = ?`).bind(id).first<{ github_id: number; expires_at: string }>();
  if (!row) return null;
  if (row.expires_at <= sqlTime(now)) {
    await db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(id).run();
    return null;
  }
  return row.github_id === allowedId ? { githubId: row.github_id } : null;
}

export async function deleteSession(db: D1Database, token: string | undefined) {
  if (token) await db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(await sha256(token)).run();
}

export const setSessionCookie = (cookies: Cookies, token: string, expires: Date) =>
  cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, secure: true, sameSite: "lax", expires });

export const allowedId = (env: Env) => Number(env.ADMIN_GITHUB_ID);

/** Paths anyone can reach: sign-in, and the files a browser fetches before signing in. Everything else needs a session. */
export const isPublic = (pathname: string) =>
  pathname.startsWith("/auth/") || pathname.startsWith("/_app/") || pathname.startsWith("/icons/") || ["/manifest.webmanifest", "/robots.txt"].includes(pathname);

/** For every load, form action, and endpoint: checks the session again, on top of the hooks.server.ts gate. */
export function requireAdmin(event: Pick<RequestEvent, "locals">): Admin {
  if (!event.locals.admin) error(401, "Sign in first.");
  return event.locals.admin;
}

export type SignIn = {
  code: string | null;
  state: string | null;
  /** From the state cookie set when sign-in started. */
  storedState: string | undefined;
};

export type GitHubClient = {
  /** Trades the OAuth code for an access token. */
  exchange: (code: string) => Promise<string>;
  /** The signed-in GitHub user's numeric ID. */
  userId: (accessToken: string) => Promise<number>;
};

/** The OAuth callback: checks state, then lets in only the allowlisted GitHub ID. */
export async function finishSignIn(input: SignIn, github: GitHubClient, db: D1Database, allowed: number, now = new Date()) {
  if (!input.code || !input.state || !input.storedState || input.state !== input.storedState) return { status: 400 as const };
  let id: number;
  try {
    id = await github.userId(await github.exchange(input.code));
  } catch (err) {
    console.warn("GitHub sign-in failed:", err);
    return { status: 400 as const };
  }
  if (!Number.isSafeInteger(allowed) || allowed <= 0 || id !== allowed) return { status: 403 as const };
  return { status: 303 as const, ...(await createSession(db, id, now)) };
}
