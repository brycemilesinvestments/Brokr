import { describe, expect, it } from "vitest";
import {
  audit_earnings_8k,
  check_cache,
  extract_guidance,
  extract_tagged_numbers,
  find_earnings_8k,
  route_guidance_action,
  run_guidance_router,
  track_vs_actual,
  write_cache,
  type GuidanceCache,
  type GuidanceCacheRecord,
  type GuidanceRouterState,
} from "@/lib/guidance";
import type { FilingRef, XbrlFact } from "@/lib/edgar";

class InMemoryGuidanceCache implements GuidanceCache {
  private store = new Map<string, GuidanceCacheRecord>();

  private key(cik: string, accessionNumber: string): string {
    return `${cik}:${accessionNumber}`;
  }

  async read(cik: string, accessionNumber: string): Promise<GuidanceCacheRecord | null> {
    return this.store.get(this.key(cik, accessionNumber)) ?? null;
  }

  async write(cik: string, accessionNumber: string, record: GuidanceCacheRecord): Promise<void> {
    this.store.set(this.key(cik, accessionNumber), record);
  }
}

const cik = "0000123456";

const filings: FilingRef[] = [
  {
    cik,
    accessionNumber: "0000123456-26-000010",
    form: "8-K",
    filingDate: "2026-06-20",
    primaryDocument: "exhibit99earnings.htm",
  },
  {
    cik,
    accessionNumber: "0000123456-26-000009",
    form: "8-K",
    filingDate: "2026-05-20",
    primaryDocument: "currentreport.htm",
  },
  {
    cik,
    accessionNumber: "0000123456-26-000008",
    form: "10-Q",
    filingDate: "2026-05-01",
    primaryDocument: "q1.htm",
  },
];

const facts: XbrlFact[] = [
  {
    concept: "Revenue",
    taxonomy: "us-gaap",
    name: "us-gaap:Revenue",
    value: "1000",
    numericValue: 1000,
    contextRef: "c1",
    context: { id: "c1", periodType: "duration", startDate: "2026-01-01", endDate: "2026-03-31" },
    unit: "USD",
  },
  {
    concept: "EarningsPerShareDiluted",
    taxonomy: "us-gaap",
    name: "us-gaap:EarningsPerShareDiluted",
    value: "1.2",
    numericValue: 1.2,
    contextRef: "c2",
    context: { id: "c2", periodType: "duration", startDate: "2026-01-01", endDate: "2026-03-31" },
    unit: "USD/shares",
  },
  {
    concept: "Revenue",
    taxonomy: "us-gaap",
    name: "us-gaap:Revenue",
    value: "1000",
    numericValue: 1000,
    contextRef: "c1",
    context: { id: "c1", periodType: "duration", startDate: "2026-01-01", endDate: "2026-03-31" },
    unit: "USD",
  },
];

describe("Guidance chunk", () => {
  it("find_earnings_8k selects earnings-related 8-K filings", () => {
    const result = find_earnings_8k(filings);
    expect(result).toHaveLength(1);
    expect(result[0].accessionNumber).toBe("0000123456-26-000010");
  });

  it("extract_tagged_numbers maps metrics and deduplicates", () => {
    const result = extract_tagged_numbers("0000123456-26-000010", facts);
    expect(result).toHaveLength(2);
    expect(result.some((x) => x.metric === "revenue")).toBe(true);
    expect(result.some((x) => x.metric === "eps")).toBe(true);
  });

  it("check_cache misses then hits after write_cache", async () => {
    const cache = new InMemoryGuidanceCache();

    const miss = await check_cache(cache, cik, "0000123456-26-000010");
    expect(miss.cacheHit).toBe(false);

    await write_cache(cache, cik, "0000123456-26-000010", {
      found: true,
      hasGuidance: true,
      ranges: [{ metric: "revenue", low: 900, high: 1100, unit: "USD" }],
    });

    const hit = await check_cache(cache, cik, "0000123456-26-000010");
    expect(hit.cacheHit).toBe(true);
    expect(hit.record?.guidance.hasGuidance).toBe(true);
  });

  it("extract_guidance uses injected extractor", async () => {
    const result = await extract_guidance({
      input: {
        cik,
        filing: filings[0],
        taggedNumbers: extract_tagged_numbers(filings[0].accessionNumber, facts),
      },
      extractor: async () => ({
        guidance: {
          found: true,
          hasGuidance: true,
          ranges: [{ metric: "revenue", low: 950, high: 1050, unit: "USD" }],
        },
        costUsd: 0.001,
      }),
    });

    expect(result.guidance.hasGuidance).toBe(true);
    expect(result.costUsd).toBeCloseTo(0.001, 6);
  });

  it("track_vs_actual computes in-range and variance", () => {
    const rows = track_vs_actual(
      {
        found: true,
        hasGuidance: true,
        ranges: [{ metric: "revenue", low: 900, high: 1100, unit: "USD" }],
      },
      extract_tagged_numbers("0000123456-26-000010", facts),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].inRange).toBe(true);
    expect(rows[0].varianceToMidpoint).toBe(0);
  });

  it("route_guidance_action follows cache-before-AI ordering", () => {
    const base: GuidanceRouterState = {
      cik,
      iteration: 0,
      completed: false,
      costUsd: 0,
      filings,
      ixbrlFactsByAccession: {},
      candidates: [],
      earnings8kAudit: [],
      taggedNumbersByAccession: {},
      cacheByAccession: null,
      extractedByAccession: null,
      comparisonsByAccession: null,
      actionsTaken: [],
      errors: [],
    };
    expect(route_guidance_action(base)).toBe("check_cache");
  });

  it("find_earnings_8k accepts item 2.02 without exhibit-name hints", () => {
    const earningsByItem: FilingRef = {
      cik,
      accessionNumber: "0001193125-25-180782",
      form: "8-K",
      filingDate: "2025-08-14",
      primaryDocument: "d926236d8k.htm",
      items: "2.02,9.01",
    };

    const audit = audit_earnings_8k([earningsByItem]);
    expect(audit).toHaveLength(1);
    expect(audit[0].accepted).toBe(true);
    expect(audit[0].score).toBe(2);
    expect(audit[0].reasons).toContain("item_2_02_results_of_operations");
  });

  it("audit_earnings_8k records rejections with reasons", () => {
    const audit = audit_earnings_8k(filings);
    expect(audit).toHaveLength(2);
    expect(audit.find((e) => e.accessionNumber === "0000123456-26-000010")?.accepted).toBe(true);
    expect(audit.find((e) => e.accessionNumber === "0000123456-26-000009")?.accepted).toBe(false);
  });

  it("run_guidance_router executes deterministic G1-G7 pipeline", async () => {
    const cache = new InMemoryGuidanceCache();
    let aiCalls = 0;

    const output = await run_guidance_router({
      cik,
      filings,
      ixbrlFactsByAccession: {
        "0000123456-26-000010": facts,
      },
      cache,
      aiExtractor: async () => {
        aiCalls += 1;
        return {
          guidance: {
            found: true,
            hasGuidance: true,
            ranges: [{ metric: "revenue", low: 900, high: 1100, unit: "USD" }],
          },
          costUsd: 0.002,
        };
      },
    });

    expect(output.completed).toBe(true);
    expect(output.terminatedReason).toBe("complete");
    expect(output.candidates.map((x) => x.accessionNumber)).toEqual([
      "0000123456-26-000010",
    ]);
    expect(output.guidanceByAccession["0000123456-26-000010"]?.hasGuidance).toBe(true);
    expect(output.comparisonsByAccession["0000123456-26-000010"]?.[0]?.inRange).toBe(true);
    expect(aiCalls).toBe(1);
  });

  it("run_guidance_router skips AI on cache hit", async () => {
    const cache = new InMemoryGuidanceCache();
    await cache.write(cik, "0000123456-26-000010", {
      cik,
      accessionNumber: "0000123456-26-000010",
      extractedAt: "2026-06-01T00:00:00.000Z",
      guidance: {
        found: true,
        hasGuidance: true,
        ranges: [{ metric: "revenue", low: 900, high: 1100 }],
      },
    });

    let aiCalls = 0;
    const output = await run_guidance_router({
      cik,
      filings,
      ixbrlFactsByAccession: {
        "0000123456-26-000010": facts,
      },
      cache,
      aiExtractor: async () => {
        aiCalls += 1;
        return {
          guidance: { found: false, hasGuidance: false, ranges: [] },
          costUsd: 0.001,
        };
      },
    });

    expect(output.cacheHits).toEqual(["0000123456-26-000010"]);
    expect(aiCalls).toBe(0);
  });
});
