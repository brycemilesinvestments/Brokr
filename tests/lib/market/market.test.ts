import { describe, expect, it, vi } from "vitest";
import { MarketCache, MarketClient, parseYahooChartResponse, isCacheValid } from "@/lib/market";
import sndkYahoo from "../../fixtures/sndk-yahoo-chart.json";

describe("Market chunk", () => {
  it("parses SNDK golden Yahoo chart response", () => {
    const { bars, currency } = parseYahooChartResponse(sndkYahoo as never, "SNDK");
    expect(bars.length).toBeGreaterThan(0);
    expect(currency).toBe("USD");
    expect(bars[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cache TTL expires entries", () => {
    const cache = new MarketCache(1000);
    cache.set("SNDK:1:2", { symbol: "SNDK", quotes: [] }, "2020-01-01T00:00:00.000Z");
    const entry = cache.get("SNDK:1:2", "2020-01-01T00:00:01.500Z");
    expect(entry).toBeUndefined();
  });

  it("isCacheValid respects expiresAt", () => {
    const entry = {
      key: "k",
      data: {},
      fetchedAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-01-01T00:01:00.000Z",
    };
    expect(isCacheValid(entry, "2020-01-01T00:00:30.000Z")).toBe(true);
    expect(isCacheValid(entry, "2020-01-01T00:02:00.000Z")).toBe(false);
  });

  it("rejects malformed Yahoo response", () => {
    expect(() => parseYahooChartResponse({ chart: {} } as never, "SNDK")).toThrow(/Malformed/);
  });

  it("MarketClient uses cache on second call", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify(sndkYahoo), { status: 200 }),
    );
    const cache = new MarketCache(60_000);
    const client = new MarketClient({
      fetchFn,
      cache,
      now: () => "2020-06-01T00:00:00.000Z",
    });

    await client.getHistory("SNDK", 1, 2);
    await client.getHistory("SNDK", 1, 2);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
