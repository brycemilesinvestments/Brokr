import { describe, expect, it } from "vitest";
import type { CompanyFactsResponse } from "@/lib/edgar";
import type { RatioSeriesPoint, TimeSeriesBundle } from "@/lib/analysis";
import type {
  DerivedMetricKey,
  DerivedMetricSeries,
  ExtendedMetricsBundle,
} from "@/lib/metrics";
import {
  buildHealthScoreBundle,
  clampScore,
  DEFAULT_WEIGHTS,
  piecewiseScore,
  weightedAverage,
} from "@/lib/metrics";
import type { HealthScoreInput } from "@/lib/metrics";

// ── Stub builders (mirrors trends.test.ts conventions) ────────────────────────

const REVENUE_CONCEPT = "RevenueFromContractWithCustomerExcludingAssessedTax";

function notReportedDerived(key: DerivedMetricKey): DerivedMetricSeries {
  return { key, status: "not_reported", annual: [], quarterly: [] };
}

function annualDerived(
  key: DerivedMetricKey,
  points: Array<{ periodEnd: string; value: number }>,
): DerivedMetricSeries {
  return {
    key,
    status: "reported",
    annual: points.map((p) => ({
      periodEnd: p.periodEnd,
      frequency: "annual" as const,
      value: p.value,
    })),
    quarterly: [],
  };
}

function annualRatioPoints(
  points: Array<{ periodEnd: string; value: number }>,
): RatioSeriesPoint[] {
  return points.map((p) => ({
    periodEnd: p.periodEnd,
    frequency: "annual" as const,
    value: p.value,
  }));
}

function annualMetricSeries(
  concept: string,
  points: Array<{ periodEnd: string; value: number }>,
) {
  return {
    concept,
    status: "reported" as const,
    unit: "USD",
    annual: points.map((p) => ({
      periodEnd: p.periodEnd,
      value: p.value,
      filed: "2020-01-01",
      form: "10-K",
      accn: "0001-01",
      unit: "USD",
    })),
    quarterly: [],
    gaps: [],
  };
}

const EMPTY_BUNDLE: ExtendedMetricsBundle = {
  cik: "test",
  entityName: "Test Co",
  cashFlowQuality: {
    freeCashFlow: notReportedDerived("free_cash_flow"),
    fcfMargin: notReportedDerived("fcf_margin"),
    capexIntensity: notReportedDerived("capex_intensity"),
  },
  workingCapital: {
    dso: notReportedDerived("dso"),
    dio: notReportedDerived("dio"),
    dpo: notReportedDerived("dpo"),
    cashConversionCycle: notReportedDerived("cash_conversion_cycle"),
  },
  dilution: {
    sbcPctRevenue: notReportedDerived("sbc_pct_revenue"),
    shareCountTrend: notReportedDerived("share_count_trend"),
    netIssuance: notReportedDerived("net_issuance"),
  },
  segments: { endMarket: [], geography: [] },
  backlog: {
    concept: "RevenueRemainingPerformanceObligation",
    status: "not_reported",
    annual: [],
    quarterly: [],
  },
  missing: [],
  notReported: [],
  chart: {},
};

function makeTimeSeries(
  seriesOverrides: Record<string, ReturnType<typeof annualMetricSeries>>,
  ratioOverrides: Partial<Record<string, RatioSeriesPoint[]>> = {},
): TimeSeriesBundle {
  return {
    cik: "test",
    entityName: "Test Co",
    rawFacts: {} as CompanyFactsResponse,
    metrics: {
      cik: "test",
      entityName: "Test Co",
      series: seriesOverrides,
    },
    ratioSeries: {
      gross_margin: ratioOverrides.gross_margin ?? [],
      operating_margin: ratioOverrides.operating_margin ?? [],
      net_margin: ratioOverrides.net_margin ?? [],
      current_ratio: ratioOverrides.current_ratio ?? [],
      debt_to_equity: ratioOverrides.debt_to_equity ?? [],
      return_on_equity: ratioOverrides.return_on_equity ?? [],
    },
    anomalies: [],
    chart: {},
  };
}

function makeInput(
  timeSeries: TimeSeriesBundle,
  bundleOverrides: Partial<ExtendedMetricsBundle> = {},
  inputOverrides: Partial<Omit<HealthScoreInput, "timeSeries" | "metricsBundle">> = {},
): HealthScoreInput {
  return {
    cik: "test",
    entityName: "Test Co",
    timeSeries,
    metricsBundle: { ...EMPTY_BUNDLE, ...bundleOverrides },
    ...inputOverrides,
  };
}

// ── H2: Transparency ──────────────────────────────────────────────────────────

describe("H2: Transparency — weights and sub-score inputs", () => {
  it("DEFAULT_WEIGHTS sum to exactly 1.0", () => {
    const total =
      DEFAULT_WEIGHTS.profitability +
      DEFAULT_WEIGHTS.growth_quality +
      DEFAULT_WEIGHTS.balance_sheet +
      DEFAULT_WEIGHTS.cash_generation +
      DEFAULT_WEIGHTS.dilution;
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("normalised custom weights also sum to 1.0", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
      },
    );
    const bundle = buildHealthScoreBundle(
      makeInput(timeSeries, {}, { weights: { profitability: 2, growth_quality: 2, balance_sheet: 1, cash_generation: 1, dilution: 1 } }),
    );
    const w = bundle.series.weights;
    const total = w.profitability + w.growth_quality + w.balance_sheet + w.cash_generation + w.dilution;
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("each HealthScorePoint contains exactly 5 sub-score entries", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([
          { periodEnd: "2023-12-31", value: 0.08 },
          { periodEnd: "2024-12-31", value: 0.12 },
        ]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));

    expect(bundle.series.points.length).toBeGreaterThan(0);
    for (const pt of bundle.series.points) {
      expect(pt.subscores).toHaveLength(5);
      const keys = pt.subscores.map((s) => s.key).sort();
      expect(keys).toEqual([
        "balance_sheet",
        "cash_generation",
        "dilution",
        "growth_quality",
        "profitability",
      ]);
    }
  });

  it("each sub-score exposes DrivingMetric inputs for drill-down (H6)", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
        gross_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.45 }]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const point = bundle.series.points[0];
    expect(point).toBeDefined();

    const profitability = point!.subscores.find((s) => s.key === "profitability");
    expect(profitability).toBeDefined();
    expect(profitability!.inputs.length).toBeGreaterThan(0);

    for (const input of profitability!.inputs) {
      expect(input.metricKey).toBeTruthy();
      expect(input.label).toBeTruthy();
      expect(input.drillDownPath).toContain("{cik}");
    }
  });

  it("growth_quality sub-score exposes DrivingMetric inputs with drillDownPath (H6)", () => {
    const timeSeries = makeTimeSeries(
      {
        [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
          { periodEnd: "2023-12-31", value: 100 },
          { periodEnd: "2024-12-31", value: 120 },
        ]),
      },
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
      },
    );
    const bundleWithFcf: Partial<ExtendedMetricsBundle> = {
      cashFlowQuality: {
        freeCashFlow: notReportedDerived("free_cash_flow"),
        fcfMargin: annualDerived("fcf_margin", [{ periodEnd: "2024-12-31", value: 0.12 }]),
        capexIntensity: notReportedDerived("capex_intensity"),
      },
    };
    const bundle = buildHealthScoreBundle(makeInput(timeSeries, bundleWithFcf));
    const point = bundle.series.points.find((p) => p.periodEnd === "2024-12-31");
    expect(point).toBeDefined();

    const growthQuality = point!.subscores.find((s) => s.key === "growth_quality");
    expect(growthQuality).toBeDefined();
    expect(growthQuality!.inputs.length).toBeGreaterThan(0);
    for (const inp of growthQuality!.inputs) {
      expect(inp.metricKey).toBeTruthy();
      expect(inp.label).toBeTruthy();
      expect(inp.drillDownPath).toContain("{cik}");
    }
  });

  it("balance_sheet sub-score exposes DrivingMetric inputs with drillDownPath (H6)", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
        current_ratio: annualRatioPoints([{ periodEnd: "2024-12-31", value: 2.0 }]),
        debt_to_equity: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.5 }]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const point = bundle.series.points.find((p) => p.periodEnd === "2024-12-31");
    expect(point).toBeDefined();

    const balanceSheet = point!.subscores.find((s) => s.key === "balance_sheet");
    expect(balanceSheet).toBeDefined();
    expect(balanceSheet!.inputs.length).toBeGreaterThan(0);
    for (const inp of balanceSheet!.inputs) {
      expect(inp.metricKey).toBeTruthy();
      expect(inp.label).toBeTruthy();
      expect(inp.drillDownPath).toContain("{cik}");
    }
  });

  it("cash_generation sub-score exposes DrivingMetric inputs with drillDownPath (H6)", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
        operating_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.12 }]),
      },
    );
    const bundleWithFcf: Partial<ExtendedMetricsBundle> = {
      cashFlowQuality: {
        freeCashFlow: notReportedDerived("free_cash_flow"),
        fcfMargin: annualDerived("fcf_margin", [{ periodEnd: "2024-12-31", value: 0.15 }]),
        capexIntensity: notReportedDerived("capex_intensity"),
      },
    };
    const bundle = buildHealthScoreBundle(makeInput(timeSeries, bundleWithFcf));
    const point = bundle.series.points.find((p) => p.periodEnd === "2024-12-31");
    expect(point).toBeDefined();

    const cashGen = point!.subscores.find((s) => s.key === "cash_generation");
    expect(cashGen).toBeDefined();
    expect(cashGen!.inputs.length).toBeGreaterThan(0);
    for (const inp of cashGen!.inputs) {
      expect(inp.metricKey).toBeTruthy();
      expect(inp.label).toBeTruthy();
      expect(inp.drillDownPath).toContain("{cik}");
    }
  });

  it("dilution sub-score exposes DrivingMetric inputs with drillDownPath (H6)", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.10 }]),
      },
    );
    const bundleWithDilution: Partial<ExtendedMetricsBundle> = {
      dilution: {
        sbcPctRevenue: annualDerived("sbc_pct_revenue", [{ periodEnd: "2024-12-31", value: 0.03 }]),
        shareCountTrend: annualDerived("share_count_trend", [
          { periodEnd: "2023-12-31", value: 1_000_000 },
          { periodEnd: "2024-12-31", value: 1_020_000 },
        ]),
        netIssuance: notReportedDerived("net_issuance"),
      },
    };
    const bundle = buildHealthScoreBundle(makeInput(timeSeries, bundleWithDilution));
    const point = bundle.series.points.find((p) => p.periodEnd === "2024-12-31");
    expect(point).toBeDefined();

    const dilution = point!.subscores.find((s) => s.key === "dilution");
    expect(dilution).toBeDefined();
    expect(dilution!.inputs.length).toBeGreaterThan(0);
    for (const inp of dilution!.inputs) {
      expect(inp.metricKey).toBeTruthy();
      expect(inp.label).toBeTruthy();
      expect(inp.drillDownPath).toContain("{cik}");
    }
  });

  it("exposes explicit weights on the HealthSeries matching DEFAULT_WEIGHTS (H2)", () => {
    const timeSeries = makeTimeSeries({});
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const w = bundle.series.weights;

    expect(w.profitability).toBe(DEFAULT_WEIGHTS.profitability);
    expect(w.growth_quality).toBe(DEFAULT_WEIGHTS.growth_quality);
    expect(w.balance_sheet).toBe(DEFAULT_WEIGHTS.balance_sheet);
    expect(w.cash_generation).toBe(DEFAULT_WEIGHTS.cash_generation);
    expect(w.dilution).toBe(DEFAULT_WEIGHTS.dilution);
  });
});

// ── SNDK-style negative margin (H1 Profitability) ─────────────────────────────

describe("Profitability sub-score: negative margin cases", () => {
  it("SNDK-style deep negative net margin (−15%) scores profitability < 50", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2022-12-31", value: -0.15 }]),
        gross_margin: annualRatioPoints([{ periodEnd: "2022-12-31", value: 0.25 }]),
        operating_margin: annualRatioPoints([{ periodEnd: "2022-12-31", value: -0.10 }]),
        return_on_equity: annualRatioPoints([{ periodEnd: "2022-12-31", value: -0.20 }]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const pt = bundle.series.points.find((p) => p.periodEnd === "2022-12-31");

    expect(pt).toBeDefined();
    const profitability = pt!.subscores.find((s) => s.key === "profitability");
    // net=-15%→~13, op=-10%→~23, gross=25%→~36; weighted avg ≈22.5
    expect(profitability!.score).toBeLessThan(25);
  });

  it("SNDK-style near-zero net margin (0%) scores profitability < 50", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2023-12-31", value: 0.0 }]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const pt = bundle.series.points.find((p) => p.periodEnd === "2023-12-31");
    const profitability = pt!.subscores.find((s) => s.key === "profitability");
    expect(profitability!.score).toBeLessThan(50);
  });

  it("healthy net margin (20%) scores profitability > 70", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.20 }]),
        gross_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.55 }]),
        operating_margin: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.18 }]),
        return_on_equity: annualRatioPoints([{ periodEnd: "2024-12-31", value: 0.25 }]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const pt = bundle.series.points.find((p) => p.periodEnd === "2024-12-31");
    const profitability = pt!.subscores.find((s) => s.key === "profitability");
    expect(profitability!.score).toBeGreaterThan(70);
  });
});

// ── H5: Framing flag ──────────────────────────────────────────────────────────

describe("H5: Framing — mandatory not-a-recommendation label", () => {
  it('framing.type is "diagnostic"', () => {
    const bundle = buildHealthScoreBundle(makeInput(makeTimeSeries({})));
    expect(bundle.series.framing.type).toBe("diagnostic");
  });

  it("framing.disclaimer is non-empty", () => {
    const bundle = buildHealthScoreBundle(makeInput(makeTimeSeries({})));
    expect(bundle.series.framing.disclaimer.length).toBeGreaterThan(0);
  });

  it("framing.text is non-empty", () => {
    const bundle = buildHealthScoreBundle(makeInput(makeTimeSeries({})));
    expect(bundle.series.framing.text.length).toBeGreaterThan(0);
  });
});

// ── H4: Time series length ────────────────────────────────────────────────────

describe("H4: Time series — series length and ordering", () => {
  it("produces one HealthScorePoint per unique annual period", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([
          { periodEnd: "2021-12-31", value: 0.08 },
          { periodEnd: "2022-12-31", value: 0.10 },
          { periodEnd: "2023-12-31", value: 0.12 },
          { periodEnd: "2024-12-31", value: 0.14 },
        ]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const annualPoints = bundle.series.points.filter((p) => p.frequency === "annual");
    expect(annualPoints.length).toBe(4);
  });

  it("series points are sorted chronologically", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([
          { periodEnd: "2022-12-31", value: 0.08 },
          { periodEnd: "2024-12-31", value: 0.12 },
          { periodEnd: "2023-12-31", value: 0.10 },
        ]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    const dates = bundle.series.points.map((p) => p.periodEnd);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("composite score is bounded [0, 100]", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([
          { periodEnd: "2020-12-31", value: -0.50 },
          { periodEnd: "2024-12-31", value: 0.50 },
        ]),
        gross_margin: annualRatioPoints([
          { periodEnd: "2020-12-31", value: 0.10 },
          { periodEnd: "2024-12-31", value: 0.80 },
        ]),
      },
    );
    const bundle = buildHealthScoreBundle(makeInput(timeSeries));
    for (const pt of bundle.series.points) {
      expect(pt.composite).toBeGreaterThanOrEqual(0);
      expect(pt.composite).toBeLessThanOrEqual(100);
    }
  });

  it("extends series when FCF margin data covers additional periods", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        net_margin: annualRatioPoints([{ periodEnd: "2023-12-31", value: 0.08 }]),
      },
    );
    const bundleWithFcf: Partial<ExtendedMetricsBundle> = {
      cashFlowQuality: {
        freeCashFlow: notReportedDerived("free_cash_flow"),
        fcfMargin: annualDerived("fcf_margin", [
          { periodEnd: "2022-12-31", value: 0.10 },
          { periodEnd: "2023-12-31", value: 0.12 },
        ]),
        capexIntensity: notReportedDerived("capex_intensity"),
      },
    };
    const bundle = buildHealthScoreBundle(makeInput(timeSeries, bundleWithFcf));
    const annualPoints = bundle.series.points.filter((p) => p.frequency === "annual");
    expect(annualPoints.length).toBe(2);
    expect(annualPoints.some((p) => p.periodEnd === "2022-12-31")).toBe(true);
  });
});

// ── H3: Peer-relative injection ───────────────────────────────────────────────

describe("H3: Peer-relative — passthrough injection", () => {
  it("peerRelative is undefined when no peer data supplied", () => {
    const bundle = buildHealthScoreBundle(makeInput(makeTimeSeries({})));
    expect(bundle.peerRelative).toBeUndefined();
  });

  it("peerRelative is forwarded unchanged when supplied", () => {
    const peerData = {
      profitability: [{ periodEnd: "2024-12-31", calendarKey: "2024", percentileRank: 75 }],
    };
    const bundle = buildHealthScoreBundle(makeInput(makeTimeSeries({}), {}, { peer: peerData }));
    expect(bundle.peerRelative).toEqual(peerData);
  });
});

// ── Score utilities ───────────────────────────────────────────────────────────

describe("Score utilities — piecewiseScore, weightedAverage, clampScore", () => {
  it("piecewiseScore clamps below lowest breakpoint", () => {
    const bp = [[0, 50], [1, 100]] as [number, number][];
    expect(piecewiseScore(-1, bp)).toBe(50);
  });

  it("piecewiseScore clamps above highest breakpoint", () => {
    const bp = [[0, 0], [1, 100]] as [number, number][];
    expect(piecewiseScore(2, bp)).toBe(100);
  });

  it("piecewiseScore interpolates linearly between breakpoints", () => {
    const bp = [[0, 0], [1, 100]] as [number, number][];
    expect(piecewiseScore(0.5, bp)).toBeCloseTo(50, 5);
  });

  it("piecewiseScore returns 50 for empty breakpoints", () => {
    expect(piecewiseScore(0.5, [])).toBe(50);
  });

  it("weightedAverage returns 50 when all scores are undefined", () => {
    expect(weightedAverage([[undefined, 1], [undefined, 2]])).toBe(50);
  });

  it("weightedAverage correctly weights two scores", () => {
    expect(weightedAverage([[100, 1], [0, 1]])).toBeCloseTo(50, 5);
    expect(weightedAverage([[100, 3], [0, 1]])).toBeCloseTo(75, 5);
  });

  it("clampScore rounds to 2dp and clamps to [0, 100]", () => {
    expect(clampScore(50.12345)).toBe(50.12);
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(110)).toBe(100);
  });
});

// ── Revenue growth map ────────────────────────────────────────────────────────

describe("buildRevenueGrowthMap", () => {
  it("computes YoY growth rate correctly", async () => {
    const { buildRevenueGrowthMap } = await import("@/lib/metrics/health");
    const series = {
      concept: REVENUE_CONCEPT,
      status: "reported" as const,
      unit: "USD",
      annual: [
        { periodEnd: "2022-12-31", value: 100, filed: "2023-01-01", form: "10-K", accn: "0001", unit: "USD" },
        { periodEnd: "2023-12-31", value: 120, filed: "2024-01-01", form: "10-K", accn: "0002", unit: "USD" },
        { periodEnd: "2024-12-31", value: 90, filed: "2025-01-01", form: "10-K", accn: "0003", unit: "USD" },
      ],
      quarterly: [],
      gaps: [],
    };

    const map = buildRevenueGrowthMap(series);
    expect(map.get("2022-12-31")).toBeUndefined();
    expect(map.get("2023-12-31")).toBeCloseTo(0.20, 5);
    expect(map.get("2024-12-31")).toBeCloseTo(-0.25, 5);
  });

  it("handles not_reported series gracefully", async () => {
    const { buildRevenueGrowthMap } = await import("@/lib/metrics/health");
    const series = { concept: REVENUE_CONCEPT, status: "not_reported" as const, annual: [], quarterly: [], gaps: [] };
    const map = buildRevenueGrowthMap(series);
    expect(map.size).toBe(0);
  });
});
