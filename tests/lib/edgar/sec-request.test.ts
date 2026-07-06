import { afterEach, describe, expect, it, vi } from "vitest";
import { SEC_MIN_REQUEST_INTERVAL_MS } from "@/lib/edgar/sec-request";
import {
  fetchSec,
  getSecRequestQueue,
  parseRetryAfterMs,
  resetSecRequestQueue,
} from "@/lib/edgar/sec-request";

describe("sec-request", () => {
  afterEach(() => {
    resetSecRequestQueue();
    vi.unstubAllGlobals();
  });

  it("parseRetryAfterMs handles seconds", () => {
    expect(parseRetryAfterMs("2")).toBe(2_000);
  });

  it("parseRetryAfterMs handles HTTP-date", () => {
    const future = new Date(Date.now() + 5_000).toUTCString();
    const delay = parseRetryAfterMs(future);
    expect(delay).not.toBeNull();
    expect(delay!).toBeGreaterThan(0);
    expect(delay!).toBeLessThanOrEqual(5_000);
  });

  it("serializes requests at SEC_MIN_REQUEST_INTERVAL_MS", async () => {
    let now = 0;
    getSecRequestQueue({
      minIntervalMs: SEC_MIN_REQUEST_INTERVAL_MS,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("ok-1", { status: 200 }))
      .mockResolvedValueOnce(new Response("ok-2", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    await fetchSec("https://www.sec.gov/test-1");
    await fetchSec("https://www.sec.gov/test-2");

    expect(now).toBeGreaterThanOrEqual(SEC_MIN_REQUEST_INTERVAL_MS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on HTTP 429", async () => {
    getSecRequestQueue({
      minIntervalMs: 0,
      now: () => 0,
      sleep: async () => undefined,
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const response = await fetchSec("https://www.sec.gov/test-retry");
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
