import { afterEach, describe, expect, it, vi } from "vitest";
import { extractRequirements, isOutOfCredits } from "../src/extract";

// What the Anthropic API answered when the account ran dry: a 400, not a 402.
const CREDIT_BODY = {
  type: "error",
  error: {
    type: "invalid_request_error",
    message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
  },
};
const OTHER_400 = { type: "error", error: { type: "invalid_request_error", message: "max_tokens: Field required" } };

const stubAnthropic = (body: unknown, status = 400) => {
  const fetchMock = vi.fn(async () => Response.json(body, { status, headers: { "request-id": "req_test" } }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};
const posting = "Requirements: Kotlin and people leadership. ".repeat(10);

afterEach(() => vi.unstubAllGlobals());

describe("extractRequirements when the Anthropic account is out of credit", () => {
  it("fails with the credit error after one call, without escalating to another model", async () => {
    const fetchMock = stubAnthropic(CREDIT_BODY);
    const err = await extractRequirements("test-key", posting).catch((e: unknown) => e);
    expect(isOutOfCredits(err)).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("still escalates on any other 400, which isn't a credit error", async () => {
    const fetchMock = stubAnthropic(OTHER_400);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = await extractRequirements("test-key", posting).catch((e: unknown) => e);
    expect(isOutOfCredits(err)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("escalating"), expect.anything());
    warn.mockRestore();
  });
});

describe("isOutOfCredits", () => {
  it("ignores errors that aren't Anthropic 400s", () => {
    expect(isOutOfCredits(new Error("Your credit balance is too low"))).toBe(false);
    expect(isOutOfCredits(null)).toBe(false);
  });
});
