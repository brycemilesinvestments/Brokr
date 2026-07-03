import { describe, expect, it, vi } from "vitest";
import {
  alignTargetSeries,
  assessPeerDataSufficiency,
  buildPeerComparisonChart,
  collectPeerPointsByKey,
  computeMedian,
  computePercentileRank,
  computeRelativeForMetric,
  computeRelativeMetrics,
  computeTrend,
  emitPeerComparisonBundle,
  flagDivergences,
  frequencyFromKey,
  isFilingWithinMonths,
  resolvePeers,
  toCalendarKey,
} from "@/lib/peers";
import type {
  ChartBundle,
  PeerExtraction,
  PeerResolveDeps,
  PeerSet,
  RelativeMetricSeries,
} from "@/lib/peers";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** SNDK (Sandisk) — June fiscal year end. Annual period ends 2025-06-27. */
const SNDK_CIK = "0002023554";
const SNDK_ENTITY = "Sandisk Corporation";

/** Micron-like peer — August fiscal year end. Annual period ends 2025-08-28. */
const MICRON_CIK = "0000723125";
const MICRON_ENTITY = "Micron Technology, Inc.";

const WDC_CIK = "0000106040";
const SEAGATE_CIK = "0001137789";

function makePeerDeps(overrides: Partial<PeerResolveDeps> = {}): PeerResolveDeps {
  return {
    fetchSic: vi.fn().mockResolvedValue("3674"),
    fetchCompaniesBySic: vi.fn().mockResolvedValue([]),
    fetchLastFilingDate: vi.fn().mockResolvedValue("2026-01-15"),
    ...overrides,
  };
}

/** Helper to build a minimal PeerExtraction for testing. */
function makePeerExtraction(
  cik: string,
  entityName: string,
  chart: ChartBundle,
): PeerExtraction {
  return {
    peerEntry: { cik, entityName, selectionMethod: "sic", sic: "3674" },
    entityName,
    chart,
  };
}

// ── P3: FY-End Alignment ──────────────────────────────────────────────────────

describe("P3: FY-end period alignment (calendar-based, not FY-label)", () => {
  it("SNDK June annual and Micron-like August annual both map to calendar year 2025", () => {
    const sndkPeriodEnd = "2025-06-27";
    const micronPeriodEnd = "2025-08-28";

    const sndkKey = toCalendarKey(sndkPeriodEnd, "annual");
    const micronKey = toCalendarKey(micronPeriodEnd, "annual");

    expect(sndkKey).toBe("2025");
    expect(micronKey).toBe("2025");
    expect(sndkKey).toBe(micronKey); // They align!
  });

  it("FY labels do NOT determine alignment — only periodEnd calendar year does", () => {
    // Both companies label their period "FY2025", but SNDK ends June and Micron ends August.
    // The point is: even if we DIDN'T use FY labels, the calendar keys would still match.
    const sndkChart: ChartBundle = {
      gross_margin: [{ x: "2025-06-27", y: 0.35, frequency: "annual" }],
    };
    const micronChart: ChartBundle = {
      gross_margin: [{ x: "2025-08-28", y: 0.40, frequency: "annual" }],
    };

    const sndkTarget = alignTargetSeries("gross_margin", sndkChart);
    expect(sndkTarget[0].calendarKey).toBe("2025");

    const micronPeer = makePeerExtraction(MICRON_CIK, MICRON_ENTITY, micronChart);
    const peerByKey = collectPeerPointsByKey("gross_margin", [micronPeer]);

    // Micron's August period end maps to the same "2025" bucket as SNDK's June period end.
    expect(peerByKey.has("2025")).toBe(true);
    expect(peerByKey.get("2025")![0].cik).toBe(MICRON_CIK);
    expect(peerByKey.get("2025")![0].periodEnd).toBe("2025-08-28");
  });

  it("quarterly alignment uses calendar quarter (Q1=Jan-Mar, Q2=Apr-Jun, etc.)", () => {
    // SNDK Q3 FY2026 ends 2026-04-03 (calendar Q2 2026)
    expect(toCalendarKey("2026-04-03", "quarterly")).toBe("2026-Q2");
    // SNDK Q2 FY2026 ends 2026-01-02 (calendar Q1 2026)
    expect(toCalendarKey("2026-01-02", "quarterly")).toBe("2026-Q1");
    // Micron-like Q ends 2026-05-29 (calendar Q2 2026)
    expect(toCalendarKey("2026-05-29", "quarterly")).toBe("2026-Q2");
  });

  it("annual and quarterly calendarKeys are distinguishable via frequencyFromKey", () => {
    expect(frequencyFromKey("2025")).toBe("annual");
    expect(frequencyFromKey("2025-Q2")).toBe("quarterly");
  });

  it("peers with different FY-ends but same calendar period land in same bucket", () => {
    const sndkChart: ChartBundle = {
      net_margin: [
        { x: "2023-06-30", y: 0.10, frequency: "annual" }, // SNDK FY2023, calendar 2023
        { x: "2024-06-28", y: 0.12, frequency: "annual" }, // SNDK FY2024, calendar 2024
        { x: "2025-06-27", y: 0.15, frequency: "annual" }, // SNDK FY2025, calendar 2025
      ],
    };
    const micronChart: ChartBundle = {
      net_margin: [
        { x: "2023-08-31", y: 0.05, frequency: "annual" }, // Micron FY2023, calendar 2023
        { x: "2024-08-29", y: 0.11, frequency: "annual" }, // Micron FY2024, calendar 2024
        { x: "2025-08-28", y: 0.18, frequency: "annual" }, // Micron FY2025, calendar 2025
      ],
    };

    const micronPeer = makePeerExtraction(MICRON_CIK, MICRON_ENTITY, micronChart);
    const series = computeRelativeForMetric("net_margin", sndkChart, [micronPeer]);

    // All 3 calendar years should have peer data aligned.
    const keysWithPeers = series.peerBand.filter((b) => b.peerCount > 0).map((b) => b.calendarKey);
    expect(keysWithPeers).toContain("2023");
    expect(keysWithPeers).toContain("2024");
    expect(keysWithPeers).toContain("2025");
  });
});

// ── P6: Missing-Data Honesty ──────────────────────────────────────────────────

describe("P6: Missing-data honesty — exclude, not zero", () => {
  it("peer missing a metric for a period is excluded; peerCount is reduced", () => {
    const targetChart: ChartBundle = {
      gross_margin: [
        { x: "2023-06-30", y: 0.30, frequency: "annual" },
        { x: "2024-06-28", y: 0.32, frequency: "annual" },
        { x: "2025-06-27", y: 0.35, frequency: "annual" },
      ],
    };
    // Peer A has data for all 3 years.
    const peerA = makePeerExtraction("0000001111", "Peer A", {
      gross_margin: [
        { x: "2023-08-31", y: 0.28, frequency: "annual" },
        { x: "2024-08-29", y: 0.31, frequency: "annual" },
        { x: "2025-08-28", y: 0.36, frequency: "annual" },
      ],
    });
    // Peer B has data only for 2024 and 2025 (missing 2023).
    const peerB = makePeerExtraction("0000002222", "Peer B", {
      gross_margin: [
        { x: "2024-09-01", y: 0.29, frequency: "annual" },
        { x: "2025-09-01", y: 0.33, frequency: "annual" },
      ],
    });

    const series = computeRelativeForMetric("gross_margin", targetChart, [peerA, peerB]);

    const band2023 = series.peerBand.find((b) => b.calendarKey === "2023");
    const band2024 = series.peerBand.find((b) => b.calendarKey === "2024");
    const band2025 = series.peerBand.find((b) => b.calendarKey === "2025");

    // 2023: only peerA contributed (peerB missing).
    expect(band2023?.peerCount).toBe(1);
    expect(band2023?.median).toBe(0.28); // Only peerA's value.

    // 2024: both peers contributed.
    expect(band2024?.peerCount).toBe(2);

    // 2025: both peers contributed.
    expect(band2025?.peerCount).toBe(2);

    // The 2023 median is NOT 0 (not zeroed) — it uses the one available peer.
    expect(band2023?.median).not.toBe(0);
    expect(band2023?.min).toBe(0.28);
    expect(band2023?.max).toBe(0.28);
  });

  it("when NO peer has data for a period, peerCount is 0 and median is null (not target fallback)", () => {
    const targetChart: ChartBundle = {
      free_cash_flow: [{ x: "2021-06-30", y: 1_000_000_000, frequency: "annual" }],
    };
    const peerA = makePeerExtraction("0000001111", "Peer A", {
      free_cash_flow: [], // No data for any period.
    });

    const series = computeRelativeForMetric("free_cash_flow", targetChart, [peerA]);
    const band = series.peerBand.find((b) => b.calendarKey === "2021");

    expect(band?.peerCount).toBe(0);
    expect(band?.median).toBeNull();
    expect(band?.min).toBeNull();
    expect(band?.max).toBeNull();
    expect(series.percentileRank[0]?.rank).toBeNull();
  });

  it("assessPeerDataSufficiency returns insufficient when n=0 on all metrics", () => {
    const targetChart: ChartBundle = {
      gross_margin: [{ x: "2025-06-27", y: 0.35, frequency: "annual" }],
    };
    const peerA = makePeerExtraction("0000001111", "Peer A", { gross_margin: [] });
    const relative = computeRelativeMetrics(targetChart, [peerA]);
    const result = assessPeerDataSufficiency(relative, ["gross_margin"], {
      minMetrics: 1,
      minPeers: 2,
    });
    expect(result.sufficient).toBe(false);
    expect(result.metricsWithData).toBe(0);
  });
});

// ── P4: Percentile Rank ───────────────────────────────────────────────────────

describe("P4: Percentile rank computation", () => {
  it("target equal to peer median ranks near 50th percentile", () => {
    // Peers: [0.10, 0.20, 0.30, 0.40, 0.50]. Median = 0.30.
    // Target = 0.30 (equals median).
    const peerValues = [0.10, 0.20, 0.30, 0.40, 0.50];
    const targetValue = 0.30;
    const rank = computePercentileRank(targetValue, peerValues);
    // Strictly below: 0.10 and 0.20 → 2/5 = 40%. (Ties at median don't count as "below".)
    expect(rank).toBe(40);
  });

  it("target above all peers ranks 100th percentile", () => {
    const peerValues = [0.10, 0.20, 0.30];
    const rank = computePercentileRank(0.99, peerValues);
    expect(rank).toBe(100);
  });

  it("target below all peers ranks 0th percentile", () => {
    const rank = computePercentileRank(0.01, [0.20, 0.30, 0.40]);
    expect(rank).toBe(0);
  });

  it("empty peer list returns 50 (neutral)", () => {
    expect(computePercentileRank(0.5, [])).toBe(50);
  });

  it("percentileRank series is computed per calendar period", () => {
    const targetChart: ChartBundle = {
      operating_margin: [
        { x: "2024-06-28", y: 0.20, frequency: "annual" },
        { x: "2025-06-27", y: 0.25, frequency: "annual" },
      ],
    };
    // Peers: all below target in both years → target should rank high.
    const peerA = makePeerExtraction("0000001111", "Peer A", {
      operating_margin: [
        { x: "2024-08-29", y: 0.10, frequency: "annual" },
        { x: "2025-08-28", y: 0.15, frequency: "annual" },
      ],
    });
    const peerB = makePeerExtraction("0000002222", "Peer B", {
      operating_margin: [
        { x: "2024-09-01", y: 0.12, frequency: "annual" },
        { x: "2025-09-01", y: 0.18, frequency: "annual" },
      ],
    });

    const series = computeRelativeForMetric("operating_margin", targetChart, [peerA, peerB]);

    for (const pr of series.percentileRank) {
      expect(pr.rank).toBe(100); // Target above both peers → 100th percentile.
    }
  });

  it("computeMedian handles even-length arrays (averages two middle values)", () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
    expect(computeMedian([1, 3])).toBe(2);
    expect(computeMedian([5])).toBe(5);
  });
});

// ── P5: Divergence Detection ──────────────────────────────────────────────────

describe("P5: Divergence detection — target vs peer median trend", () => {
  it("target margin up while peer median down → flagged as divergence", () => {
    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "gross_margin",
        target: [
          { calendarKey: "2024", periodEnd: "2024-06-28", value: 0.30, frequency: "annual" },
          { calendarKey: "2025", periodEnd: "2025-06-27", value: 0.38, frequency: "annual" }, // +26.7% → "up"
        ],
        peerBand: [
          {
            calendarKey: "2024",
            periodEnd: "2024-06-28",
            frequency: "annual",
            peerCount: 2,
            min: 0.25,
            median: 0.28,
            max: 0.32,
            peers: [],
          },
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 0.20,
            median: 0.23,  // Down from 0.28 → "down"
            max: 0.26,
            peers: [],
          },
        ],
        percentileRank: [
          { calendarKey: "2024", rank: 50 },
          { calendarKey: "2025", rank: 80 },
        ],
      },
    ];

    const divergences = flagDivergences(relativeMetrics);

    expect(divergences).toHaveLength(1);
    expect(divergences[0].metricKey).toBe("gross_margin");
    expect(divergences[0].calendarKey).toBe("2025");
    expect(divergences[0].targetTrend).toBe("up");
    expect(divergences[0].peerMedianTrend).toBe("down");
    expect(divergences[0].description).toMatch(/up.*down|down.*up/i);
  });

  it("target margin down while peer median up → also flagged", () => {
    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "net_margin",
        target: [
          { calendarKey: "2024", periodEnd: "2024-06-28", value: 0.20, frequency: "annual" },
          { calendarKey: "2025", periodEnd: "2025-06-27", value: 0.14, frequency: "annual" }, // -30% → "down"
        ],
        peerBand: [
          {
            calendarKey: "2024",
            periodEnd: "2024-06-28",
            frequency: "annual",
            peerCount: 2,
            min: 0.10,
            median: 0.15,
            max: 0.20,
            peers: [],
          },
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 0.18,
            median: 0.22,  // Up from 0.15 → "up"
            max: 0.26,
            peers: [],
          },
        ],
        percentileRank: [],
      },
    ];

    const divergences = flagDivergences(relativeMetrics);
    expect(divergences).toHaveLength(1);
    expect(divergences[0].targetTrend).toBe("down");
    expect(divergences[0].peerMedianTrend).toBe("up");
  });

  it("target and peer median both moving in same direction → not flagged", () => {
    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "gross_margin",
        target: [
          { calendarKey: "2024", periodEnd: "2024-06-28", value: 0.30, frequency: "annual" },
          { calendarKey: "2025", periodEnd: "2025-06-27", value: 0.35, frequency: "annual" },
        ],
        peerBand: [
          {
            calendarKey: "2024",
            periodEnd: "2024-06-28",
            frequency: "annual",
            peerCount: 2,
            min: 0.25,
            median: 0.28,
            max: 0.32,
            peers: [],
          },
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 0.29,
            median: 0.33,  // Also up → same direction
            max: 0.37,
            peers: [],
          },
        ],
        percentileRank: [],
      },
    ];

    const divergences = flagDivergences(relativeMetrics);
    expect(divergences).toHaveLength(0);
  });

  it("computeTrend: correctly classifies up/down/flat", () => {
    expect(computeTrend(0.20, 0.22)).toBe("up");      // +10%
    expect(computeTrend(0.20, 0.19)).toBe("down");    // -5%
    expect(computeTrend(0.20, 0.201)).toBe("flat");   // +0.5% < threshold
    expect(computeTrend(0, 5)).toBe("up");            // From zero
    expect(computeTrend(0, -5)).toBe("down");         // From zero, negative
    expect(computeTrend(0, 0)).toBe("flat");          // No change
  });

  it("series with fewer than 2 periods produces no divergences", () => {
    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "gross_margin",
        target: [{ calendarKey: "2025", periodEnd: "2025-06-27", value: 0.30, frequency: "annual" }],
        peerBand: [
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 1,
            min: 0.25,
            median: 0.25,
            max: 0.25,
            peers: [],
          },
        ],
        percentileRank: [],
      },
    ];
    expect(flagDivergences(relativeMetrics)).toHaveLength(0);
  });
});

// ── P1: Peer Resolution ───────────────────────────────────────────────────────

describe("P1: Peer resolution", () => {
  it("resolves peers by SIC code (deterministic default)", async () => {
    const deps = makePeerDeps({
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
        { cik: SEAGATE_CIK, entityName: "Seagate Technology" },
      ]),
    });

    const peerSet = await resolvePeers(
      { targetCik: "0000999999", targetEntityName: "Generic Target" },
      deps,
    );

    expect(peerSet.status).toBe("ok");
    expect(peerSet.sic).toBe("3674");
    expect(peerSet.peers).toHaveLength(2);
    expect(peerSet.peers.every((p) => p.selectionMethod === "sic")).toBe(true);
    expect(peerSet.peers.map((p) => p.cik)).toContain(MICRON_CIK);
  });

  it("filters SIC candidates to companies with filing in last 24 months", async () => {
    const deps = makePeerDeps({
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
        { cik: "0000350000", entityName: "Defunct Shell Inc" },
        { cik: SEAGATE_CIK, entityName: "Seagate Technology" },
      ]),
      fetchLastFilingDate: vi.fn().mockImplementation(async (cik: string) => {
        if (cik === "0000350000") return "2019-01-01";
        return "2026-01-15";
      }),
    });

    const peerSet = await resolvePeers(
      { targetCik: "0000999999", targetEntityName: "Test Target" },
      deps,
    );

    expect(peerSet.peers.map((p) => p.cik)).not.toContain("0000350000");
    expect(peerSet.peers.map((p) => p.cik)).toContain(MICRON_CIK);
    expect(peerSet.peers.map((p) => p.cik)).toContain(SEAGATE_CIK);
  });

  it("isFilingWithinMonths rejects filings older than cutoff", () => {
    const now = new Date("2026-06-29");
    expect(isFilingWithinMonths("2025-07-01", 24, now)).toBe(true);
    expect(isFilingWithinMonths("2019-01-01", 24, now)).toBe(false);
  });

  it("manual overrides are included and labelled as 'manual'", async () => {
    const deps = makePeerDeps({
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
      ]),
    });

    const peerSet = await resolvePeers(
      {
        targetCik: SNDK_CIK,
        targetEntityName: SNDK_ENTITY,
        manualPeerCiks: [SEAGATE_CIK],
      },
      deps,
    );

    const manual = peerSet.peers.filter((p) => p.selectionMethod === "manual");
    expect(manual.some((p) => p.cik === SEAGATE_CIK)).toBe(true);
  });

  it("excludes target itself from peer list", async () => {
    const deps = makePeerDeps({
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: "0000999999", entityName: "Test Target" },
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
        { cik: SEAGATE_CIK, entityName: "Seagate Technology" },
      ]),
    });

    const peerSet = await resolvePeers(
      { targetCik: "0000999999", targetEntityName: "Test Target" },
      deps,
    );

    expect(peerSet.peers.map((p) => p.cik)).not.toContain("0000999999");
    expect(peerSet.peers.length).toBeGreaterThanOrEqual(2);
  });

  it("reports INSUFFICIENT_PEERS when fewer than 2 peers resolved", async () => {
    const deps = makePeerDeps({
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
      ]),
      fetchLastFilingDate: vi.fn().mockResolvedValue("2019-01-01"),
    });

    const peerSet = await resolvePeers(
      { targetCik: "0000999999", targetEntityName: "Lonely Target" },
      deps,
    );

    expect(peerSet.status).toBe("insufficient_peers");
    expect(peerSet.peers).toHaveLength(0);
  });

  it("reports INSUFFICIENT_PEERS when SIC fetch fails and no manual peers", async () => {
    const deps = makePeerDeps({
      fetchSic: vi.fn().mockResolvedValue(null),
      fetchCompaniesBySic: vi.fn().mockResolvedValue([]),
    });

    const peerSet = await resolvePeers(
      { targetCik: "0000999999", targetEntityName: "No Peers Co" },
      deps,
    );

    expect(peerSet.status).toBe("insufficient_peers");
    expect(peerSet.peers).toHaveLength(0);
    expect(deps.fetchCompaniesBySic).not.toHaveBeenCalled();
  });

  it("resolves peers from Yahoo compare suggestions before SIC", async () => {
    const deps = makePeerDeps({
      fetchComparePeersByTicker: vi.fn().mockResolvedValue([
        { ticker: "WDC", score: 0.15 },
        { ticker: "STX", score: 0.13 },
        { ticker: "MU", score: 0.12 },
      ]),
      resolveTickerToCompany: vi.fn().mockImplementation(async (ticker: string) => {
        const map: Record<string, { cik: string; entityName: string }> = {
          WDC: { cik: WDC_CIK, entityName: "Western Digital Corporation" },
          STX: { cik: SEAGATE_CIK, entityName: "Seagate Technology Holdings plc" },
          MU: { cik: MICRON_CIK, entityName: MICRON_ENTITY },
        };
        return map[ticker] ?? null;
      }),
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: "0000350000", entityName: "Should Not Be Used" },
      ]),
    });

    const peerSet = await resolvePeers(
      {
        targetCik: "0000999999",
        targetEntityName: "Generic Target",
        ticker: "SNDK",
      },
      deps,
    );

    expect(peerSet.status).toBe("ok");
    expect(peerSet.peers).toHaveLength(3);
    expect(peerSet.peers.every((peer) => peer.selectionMethod === "yahoo")).toBe(true);
    expect(peerSet.peers.map((peer) => peer.cik)).toEqual([WDC_CIK, SEAGATE_CIK, MICRON_CIK]);
    expect(deps.fetchCompaniesBySic).not.toHaveBeenCalled();
  });

  it("falls back to SIC when Yahoo suggestions do not resolve enough peers", async () => {
    const deps = makePeerDeps({
      fetchComparePeersByTicker: vi.fn().mockResolvedValue([
        { ticker: "FOREIGN", score: 0.9 },
      ]),
      resolveTickerToCompany: vi.fn().mockResolvedValue(null),
      fetchCompaniesBySic: vi.fn().mockResolvedValue([
        { cik: MICRON_CIK, entityName: MICRON_ENTITY },
        { cik: SEAGATE_CIK, entityName: "Seagate Technology" },
      ]),
    });

    const peerSet = await resolvePeers(
      {
        targetCik: "0000999999",
        targetEntityName: "Generic Target",
        ticker: "SNDK",
      },
      deps,
    );

    expect(peerSet.status).toBe("ok");
    expect(peerSet.peers.every((peer) => peer.selectionMethod === "sic")).toBe(true);
    expect(deps.fetchCompaniesBySic).toHaveBeenCalled();
  });
});

// ── P7: Chart Bundle Emission ─────────────────────────────────────────────────

describe("P7: Chart bundle emission", () => {
  it("emits target line + peer band (min/median/max) per metric", () => {
    const targetChart: ChartBundle = {
      gross_margin: [
        { x: "2024-06-28", y: 0.30, frequency: "annual" },
        { x: "2025-06-27", y: 0.35, frequency: "annual" },
      ],
    };

    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "gross_margin",
        target: [
          { calendarKey: "2024", periodEnd: "2024-06-28", value: 0.30, frequency: "annual" },
          { calendarKey: "2025", periodEnd: "2025-06-27", value: 0.35, frequency: "annual" },
        ],
        peerBand: [
          {
            calendarKey: "2024",
            periodEnd: "2024-06-28",
            frequency: "annual",
            peerCount: 2,
            min: 0.20,
            median: 0.25,
            max: 0.28,
            peers: [],
          },
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 2,
            min: 0.22,
            median: 0.27,
            max: 0.32,
            peers: [],
          },
        ],
        percentileRank: [],
      },
    ];

    const chart = buildPeerComparisonChart(relativeMetrics, targetChart);

    // Target line preserved.
    expect(chart["gross_margin"]).toEqual(targetChart["gross_margin"]);

    // Peer band series emitted.
    expect(chart["peer_band:gross_margin"]).toHaveLength(2);
    expect(chart["peer_min:gross_margin"]).toHaveLength(2);
    expect(chart["peer_max:gross_margin"]).toHaveLength(2);

    // Band median values.
    expect(chart["peer_band:gross_margin"]![0].y).toBe(0.25);
    expect(chart["peer_band:gross_margin"]![1].y).toBe(0.27);

    // Band x values match target's periodEnd (for same-axis overlay).
    expect(chart["peer_band:gross_margin"]![0].x).toBe("2024-06-28");
    expect(chart["peer_band:gross_margin"]![1].x).toBe("2025-06-27");
  });

  it("emitPeerComparisonBundle produces complete bundle with all required fields", () => {
    const peerSet: PeerSet = {
      targetCik: SNDK_CIK,
      targetEntityName: SNDK_ENTITY,
      sic: "3674",
      peers: [{ cik: MICRON_CIK, entityName: MICRON_ENTITY, selectionMethod: "sic", sic: "3674" }],
      status: "ok",
    };

    const targetChart: ChartBundle = {
      gross_margin: [{ x: "2025-06-27", y: 0.35, frequency: "annual" }],
    };

    const bundle = emitPeerComparisonBundle({
      targetCik: SNDK_CIK,
      targetEntityName: SNDK_ENTITY,
      peerSet,
      targetChart,
      relativeMetrics: [],
      divergences: [],
    });

    expect(bundle.targetCik).toBe(SNDK_CIK);
    expect(bundle.targetEntityName).toBe(SNDK_ENTITY);
    expect(bundle.peerSet).toBe(peerSet);
    expect(bundle.relativeMetrics).toEqual([]);
    expect(bundle.divergences).toEqual([]);
    expect(typeof bundle.chart).toBe("object");
  });

  it("chart points have valid shape (x=YYYY-MM-DD, y=number, frequency set)", () => {
    const targetChart: ChartBundle = {
      net_margin: [{ x: "2025-06-27", y: 0.15, frequency: "annual" }],
    };
    const relativeMetrics: RelativeMetricSeries[] = [
      {
        metricKey: "net_margin",
        target: [{ calendarKey: "2025", periodEnd: "2025-06-27", value: 0.15, frequency: "annual" }],
        peerBand: [
          {
            calendarKey: "2025",
            periodEnd: "2025-06-27",
            frequency: "annual",
            peerCount: 1,
            min: 0.10,
            median: 0.10,
            max: 0.10,
            peers: [],
          },
        ],
        percentileRank: [],
      },
    ];

    const chart = buildPeerComparisonChart(relativeMetrics, targetChart);

    for (const key of Object.keys(chart)) {
      for (const pt of chart[key]!) {
        expect(pt.x).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof pt.y).toBe("number");
        expect(["annual", "quarterly"]).toContain(pt.frequency);
      }
    }
  });
});

// ── Integration: full pipeline with synthetic data ────────────────────────────

describe("Integration: full peer comparison pipeline with synthetic peer data", () => {
  it("produces relative metrics with peer band across multiple metrics", async () => {
    const targetChart: ChartBundle = {
      gross_margin: [
        { x: "2024-06-28", y: 0.32, frequency: "annual" },
        { x: "2025-06-27", y: 0.36, frequency: "annual" },
      ],
      operating_margin: [
        { x: "2024-06-28", y: 0.12, frequency: "annual" },
        { x: "2025-06-27", y: 0.15, frequency: "annual" },
      ],
    };

    const peerExtractions: PeerExtraction[] = [
      makePeerExtraction(MICRON_CIK, MICRON_ENTITY, {
        gross_margin: [
          { x: "2024-08-29", y: 0.28, frequency: "annual" },
          { x: "2025-08-28", y: 0.31, frequency: "annual" },
        ],
        operating_margin: [
          { x: "2024-08-29", y: 0.08, frequency: "annual" },
          { x: "2025-08-28", y: 0.10, frequency: "annual" },
        ],
      }),
      makePeerExtraction("0000891482", "Seagate Technology", {
        gross_margin: [
          { x: "2024-06-30", y: 0.26, frequency: "annual" },
          { x: "2025-06-30", y: 0.29, frequency: "annual" },
        ],
        operating_margin: [
          { x: "2024-06-30", y: 0.05, frequency: "annual" },
          { x: "2025-06-30", y: 0.07, frequency: "annual" },
        ],
      }),
    ];

    const relativeMetrics = computeRelativeMetrics(targetChart, peerExtractions);

    expect(relativeMetrics).toHaveLength(2);

    const grossMarginSeries = relativeMetrics.find((s) => s.metricKey === "gross_margin");
    expect(grossMarginSeries).toBeDefined();

    // Target is above both peers → high percentile rank.
    for (const pr of grossMarginSeries!.percentileRank) {
      expect(pr.rank).toBe(100);
    }

    // Peer band contains both peers for aligned periods.
    for (const band of grossMarginSeries!.peerBand) {
      expect(band.peerCount).toBe(2);
    }

    // Divergences: target up, peers both up too → no divergence expected.
    const divergences = flagDivergences(relativeMetrics);
    expect(divergences).toHaveLength(0);
  });

  it("regression: with n>=2 real peers, target !== median unless genuine coincidence", () => {
    const targetChart: ChartBundle = {
      gross_margin: [{ x: "2025-06-27", y: 0.36, frequency: "annual" }],
    };

    const peerExtractions: PeerExtraction[] = [
      makePeerExtraction(MICRON_CIK, MICRON_ENTITY, {
        gross_margin: [{ x: "2025-08-28", y: 0.31, frequency: "annual" }],
      }),
      makePeerExtraction("0000891482", "Seagate Technology", {
        gross_margin: [{ x: "2025-06-30", y: 0.29, frequency: "annual" }],
      }),
    ];

    const series = computeRelativeForMetric("gross_margin", targetChart, peerExtractions);
    const band = series.peerBand.at(-1)!;

    expect(band.peerCount).toBeGreaterThanOrEqual(2);
    expect(band.median).not.toBeNull();
    expect(band.min).not.toBe(band.max);
    expect(band.median).not.toBe(series.target.at(-1)!.value);
  });

  it("peer group with n>=2 for majority of display metrics with synthetic data", () => {
    const targetChart: ChartBundle = {
      gross_margin: [{ x: "2025-06-27", y: 0.36, frequency: "annual" }],
      net_margin: [{ x: "2025-06-27", y: 0.15, frequency: "annual" }],
      operating_margin: [{ x: "2025-06-27", y: 0.12, frequency: "annual" }],
      current_ratio: [{ x: "2025-06-27", y: 1.8, frequency: "annual" }],
      debt_to_equity: [{ x: "2025-06-27", y: 0.5, frequency: "annual" }],
      fcf_margin: [{ x: "2025-06-27", y: 0.08, frequency: "annual" }],
    };

    const peerChart = {
      gross_margin: [{ x: "2025-08-28", y: 0.31, frequency: "annual" as const }],
      net_margin: [{ x: "2025-08-28", y: 0.10, frequency: "annual" as const }],
      operating_margin: [{ x: "2025-08-28", y: 0.08, frequency: "annual" as const }],
      current_ratio: [{ x: "2025-08-28", y: 2.0, frequency: "annual" as const }],
      debt_to_equity: [{ x: "2025-08-28", y: 0.6, frequency: "annual" as const }],
      fcf_margin: [{ x: "2025-08-28", y: 0.05, frequency: "annual" as const }],
    };

    const peerExtractions: PeerExtraction[] = [
      makePeerExtraction(MICRON_CIK, MICRON_ENTITY, peerChart),
      makePeerExtraction(WDC_CIK, "Western Digital Corp", peerChart),
      makePeerExtraction(SEAGATE_CIK, "Seagate Technology", peerChart),
    ];

    const relativeMetrics = computeRelativeMetrics(targetChart, peerExtractions);
    const displayMetrics = [
      "gross_margin",
      "net_margin",
      "operating_margin",
      "current_ratio",
      "debt_to_equity",
      "fcf_margin",
    ] as const;

    const sufficiency = assessPeerDataSufficiency(relativeMetrics, displayMetrics);
    expect(sufficiency.sufficient).toBe(true);
    expect(sufficiency.metricsWithData).toBeGreaterThanOrEqual(4);
  });
});
