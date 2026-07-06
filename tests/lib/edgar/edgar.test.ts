import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EdgarClient,
  extractIxbrl,
  getLatestSharesOutstanding,
  resolveDocumentUrl,
  assertUserAgent,
  EdgarUserAgentError,
  SEC_MIN_REQUEST_INTERVAL_MS,
  toFinancials,
} from "@/lib/edgar";
import { getSecRequestQueue, resetSecRequestQueue } from "@/lib/edgar/sec-request";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";
import sndkGolden from "../../fixtures/sndk-golden-data.json";

const ixbrlFixture = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10q-ixbrl.htm"),
  "utf8",
);

describe("Edgar chunk", () => {
  afterEach(() => {
    resetSecRequestQueue();
    vi.unstubAllGlobals();
  });

  it("companyfacts → 148089758 shares outstanding", () => {
    const shares = getLatestSharesOutstanding(sndkCompanyFacts as never);
    expect(shares).toBe(sndkGolden.shares);
  });

  it("iXBRL extraction → 1123 facts", () => {
    const { facts } = extractIxbrl(ixbrlFixture);
    expect(facts.length).toBe(sndkGolden.ixbrlMetrics.factCount);
  });

  it("throttle interval ≥ SEC_MIN_REQUEST_INTERVAL_MS", async () => {
    let now = 0;
    getSecRequestQueue({
      minIntervalMs: SEC_MIN_REQUEST_INTERVAL_MS,
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
    });

    const client = new EdgarClient({
      userAgent: "test-agent",
    });

    const mockFetch = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    await client.fetchJson("https://data.sec.gov/test-1.json", { useCache: false });
    await client.fetchJson("https://data.sec.gov/test-2.json", { useCache: false });

    expect(now).toBeGreaterThanOrEqual(SEC_MIN_REQUEST_INTERVAL_MS);
  });

  it("throws when User-Agent missing", () => {
    expect(() => assertUserAgent("")).toThrow(EdgarUserAgentError);
    expect(() => new EdgarClient({ userAgent: "  " })).toThrow(/User-Agent/);
  });

  it("resolveDocumentUrl handles /ix?doc= paths", () => {
    expect(
      resolveDocumentUrl("/ix?doc=/Archives/edgar/data/2023554/000162828026029401/sndk.htm"),
    ).toBe("https://www.sec.gov/Archives/edgar/data/2023554/000162828026029401/sndk.htm");
  });

  it("toFinancials maps companyfacts", () => {
    const financials = toFinancials(sndkCompanyFacts as never);
    expect(financials.cik).toBeTruthy();
    expect(financials.sharesOutstanding).toBe(sndkGolden.shares);
  });
});
