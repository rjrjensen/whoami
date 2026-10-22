import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryD1 } from "./d1";

vi.mock("cloudflare:workers", () => ({ WorkerEntrypoint: class {} }));
vi.mock("../src/extract", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/extract")>()), extractRequirements: vi.fn() }));
vi.mock("../src/notify", () => ({ notify: vi.fn(async () => {}), notifyDay: vi.fn(), notifyGaps: vi.fn() }));

const { extractRequirements } = await import("../src/extract");
const { notify } = await import("../src/notify");
const { default: worker } = await import("../src/index");

const apiError = (message: string) =>
  Anthropic.APIError.generate(400, { type: "error", error: { type: "invalid_request_error", message } }, undefined, new Headers());
const CREDIT_ERROR = apiError("Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.");

const TOPIC = "secret-topic-for-tests";
let sqlite: ReturnType<typeof memoryD1>["sqlite"];
let env: Record<string, unknown>;
let limited = false;

beforeEach(() => {
  vi.clearAllMocks();
  limited = false;
  const d1 = memoryD1("0001_init.sql", "0002_milestones.sql", "0003_admin.sql", "0004_alert_times.sql");
  sqlite = d1.sqlite;
  env = {
    DB: d1.db,
    LIMITER: { limit: async () => ({ success: !limited }) },
    ALLOWED_ORIGINS: "https://ryanjensen.dev",
    MONTHLY_CAP: "300",
    ANTHROPIC_API_KEY: "test",
    IP_HASH_SALT: "salt",
    ALLOW_NO_TURNSTILE: "1",
    SITE_URL: "https://ryanjensen.dev",
    NTFY_SERVER: "https://ntfy.example",
    NTFY_TOPIC: TOPIC,
  };
});

async function call(path: string, init: RequestInit = { method: "POST" }) {
  const waits: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p), passThroughOnException() {}, props: {} };
  const request = new Request(`https://api.ryanjensen.dev${path}`, { ...init, headers: { Origin: "https://ryanjensen.dev", ...init.headers } });
  // @ts-expect-error a partial Env and ExecutionContext are enough here
  const res: Response = await worker.fetch(request, env, ctx);
  await Promise.all(waits);
  return { res, text: await res.text() };
}
const check = () => call("/fit-check", { method: "POST", body: JSON.stringify({ jobDescription: "Requirements: Kotlin and people leadership. ".repeat(10) }) });
const nudge = () => call("/fit-check/nudge");
const hoursAgo = (name: string, hours: number) => sqlite.prepare(`UPDATE alert_times SET at = datetime('now', ?) WHERE name = ?`).run(`-${hours} hours`, name);

describe("POST /fit-check when Claude is out of credits", () => {
  it("answers out_of_credits (503) instead of upstream, and notes the error", async () => {
    vi.mocked(extractRequirements).mockRejectedValue(CREDIT_ERROR);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { res, text } = await check();
    expect(res.status).toBe(503);
    expect(JSON.parse(text)).toMatchObject({ error: "out_of_credits", message: expect.stringContaining("out of Claude or Jev credits") });
    expect(sqlite.prepare(`SELECT name FROM alert_times`).all()).toEqual([{ name: "out_of_credits" }]);
  });

  it("keeps every other failure as upstream (502)", async () => {
    vi.mocked(extractRequirements).mockRejectedValue(apiError("max_tokens: Field required"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { res, text } = await check();
    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toMatchObject({ error: "upstream" });
    expect(sqlite.prepare(`SELECT name FROM alert_times`).all()).toEqual([]);
  });
});

describe("POST /fit-check/nudge", () => {
  it("pushes to Ryan after a credit error, with CORS, and never returns the topic", async () => {
    vi.mocked(extractRequirements).mockRejectedValue(CREDIT_ERROR);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await check();

    const { res, text } = await nudge();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ ok: true });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://ryanjensen.dev");
    expect(text).not.toContain(TOPIC);
    expect(notify).toHaveBeenCalledOnce();
    expect(vi.mocked(notify).mock.calls[0][0]).toEqual({ server: "https://ntfy.example", topic: TOPIC });
    expect(vi.mocked(notify).mock.calls[0][1]).toMatch(/out of Claude credits/);
  });

  it("pushes at most once an hour, and still answers ok while the cooldown holds", async () => {
    sqlite.exec(`INSERT INTO alert_times (name) VALUES ('out_of_credits')`);
    for (let i = 0; i < 3; i++) {
      const { res, text } = await nudge();
      expect(res.status).toBe(200);
      expect(JSON.parse(text)).toEqual({ ok: true });
    }
    expect(notify).toHaveBeenCalledOnce();

    hoursAgo("nudge", 2);
    await nudge();
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it("doesn't push without a credit error in the last hour", async () => {
    expect((await nudge()).res.status).toBe(200);
    sqlite.exec(`INSERT INTO alert_times (name) VALUES ('out_of_credits')`);
    hoursAgo("out_of_credits", 2);
    const { res, text } = await nudge();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ ok: true });
    expect(notify).not.toHaveBeenCalled();
  });

  it("uses the per-IP rate limit", async () => {
    sqlite.exec(`INSERT INTO alert_times (name) VALUES ('out_of_credits')`);
    limited = true;
    const { res, text } = await nudge();
    expect(res.status).toBe(429);
    expect(JSON.parse(text)).toMatchObject({ error: "rate_limited" });
    expect(notify).not.toHaveBeenCalled();
  });

  it("answers the CORS preflight and only accepts POST", async () => {
    const preflight = await call("/fit-check/nudge", { method: "OPTIONS" });
    expect(preflight.res.status).toBe(204);
    expect(preflight.res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    const get = await call("/fit-check/nudge", { method: "GET" });
    expect(get.res.status).toBe(405);
    expect(get.res.headers.get("Allow")).toBe("POST, OPTIONS");
  });

  it("answers ok without pushing when no ntfy topic is set", async () => {
    sqlite.exec(`INSERT INTO alert_times (name) VALUES ('out_of_credits')`);
    delete env.NTFY_TOPIC;
    expect((await nudge()).res.status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
  });
});
