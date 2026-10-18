import { describe, expect, it, vi } from "vitest";
import { testDb } from "../../test/d1";
import { createSession, finishSignIn, isPublic, SESSION_COOKIE, SESSION_DAYS, validateSession, type GitHubClient } from "./auth";
import { gate } from "./gate";

const RYAN = 1001;
const github = (id: number): GitHubClient => ({ exchange: async () => "token", userId: async () => id });
const ok = { code: "code", state: "s1", storedState: "s1" };

describe("finishSignIn", () => {
  it("lets the allowlisted GitHub ID in with a 30-day session", async () => {
    const db = testDb();
    const now = new Date("2026-10-18T12:00:00Z");
    const result = await finishSignIn(ok, github(RYAN), db, RYAN, now);
    expect(result.status).toBe(303);
    if (result.status !== 303) return;
    expect(result.expiresAt.getTime() - now.getTime()).toBe(SESSION_DAYS * 86_400_000);
    expect(await validateSession(db, result.token, RYAN, now)).toEqual({ githubId: RYAN });
  });

  it("turns away any other GitHub ID with a 403 and no session", async () => {
    const db = testDb();
    expect((await finishSignIn(ok, github(2002), db, RYAN)).status).toBe(403);
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM admin_sessions`).first("n")).toBe(0);
  });

  it("refuses a missing or mismatched state before calling GitHub", async () => {
    const client = { exchange: vi.fn(async () => "token"), userId: vi.fn(async () => RYAN) };
    for (const input of [{ ...ok, state: "other" }, { ...ok, storedState: undefined }, { ...ok, code: null }])
      expect((await finishSignIn(input, client, testDb(), RYAN)).status).toBe(400);
    expect(client.exchange).not.toHaveBeenCalled();
  });

  it("refuses everyone when the allowlist isn't set", async () => {
    expect((await finishSignIn(ok, github(0), testDb(), Number(undefined))).status).toBe(403);
  });
});

describe("sessions", () => {
  it("expire after 30 days and are deleted when seen expired", async () => {
    const db = testDb();
    const start = new Date("2026-10-01T00:00:00Z");
    const { token } = await createSession(db, RYAN, start);
    expect(await validateSession(db, token, RYAN, new Date("2026-10-30T23:59:00Z"))).not.toBeNull();
    expect(await validateSession(db, token, RYAN, new Date("2026-10-31T00:00:00Z"))).toBeNull();
    expect(await db.prepare(`SELECT COUNT(*) AS n FROM admin_sessions`).first("n")).toBe(0);
  });

  it("stores only a hash of the token", async () => {
    const db = testDb();
    const { token } = await createSession(db, RYAN);
    expect(await db.prepare(`SELECT id FROM admin_sessions`).first("id")).not.toBe(token);
  });

  it("stop working if the allowlisted ID changes", async () => {
    const db = testDb();
    const { token } = await createSession(db, RYAN);
    expect(await validateSession(db, token, 3003)).toBeNull();
  });

  it("reject unknown and missing tokens", async () => {
    expect(await validateSession(testDb(), "made-up", RYAN)).toBeNull();
    expect(await validateSession(testDb(), undefined, RYAN)).toBeNull();
  });
});

describe("gate", () => {
  const env = { DB: testDb(), ADMIN_GITHUB_ID: String(RYAN) } as unknown as Env;
  const run = async (path: string, { token, accept = "text/html", bypass = false, method = "GET" }: { token?: string; accept?: string; bypass?: boolean; method?: string } = {}) => {
    const url = new URL(`http://localhost:3101${path}`);
    const event = {
      url,
      request: new Request(url, { method, headers: { accept } }),
      platform: { env },
      locals: { admin: null },
      cookies: { get: (name: string) => (name === SESSION_COOKIE ? token : undefined) },
    };
    const resolve = vi.fn(async () => new Response("page"));
    try {
      // @ts-expect-error a partial RequestEvent is enough for the gate
      const res = await gate(() => bypass)({ event, resolve });
      return { status: res.status, resolved: resolve.mock.calls.length > 0, admin: event.locals.admin };
    } catch (thrown) {
      return { status: (thrown as { status: number }).status, location: (thrown as { location: string }).location, resolved: false };
    }
  };

  it("sends a signed-out page request to sign-in", async () => {
    expect(await run("/")).toMatchObject({ status: 303, location: "/auth/login", resolved: false });
  });

  it("answers signed-out form posts and data requests with 401", async () => {
    expect(await run("/questions", { method: "POST", accept: "application/json" })).toMatchObject({ status: 401, resolved: false });
    expect(await run("/reports/__data.json", { accept: "*/*" })).toMatchObject({ status: 401, resolved: false });
  });

  it("lets a valid session through", async () => {
    const { token } = await createSession(env.DB, RYAN);
    expect(await run("/trends", { token })).toMatchObject({ status: 200, resolved: true, admin: { githubId: RYAN } });
  });

  it("leaves /auth/* and static files open", async () => {
    for (const path of ["/auth/login", "/auth/github/callback", "/manifest.webmanifest", "/icons/icon-192.png", "/_app/immutable/x.js"])
      expect((await run(path)).resolved).toBe(true);
    expect(isPublic("/authx")).toBe(false);
  });

  it("only skips sign-in when the bypass says so", async () => {
    expect(await run("/", { bypass: true })).toMatchObject({ resolved: true, admin: { githubId: RYAN } });
  });
});
