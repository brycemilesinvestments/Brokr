import { describe, expect, it } from "vitest";
import type { CompanyFactsResponse } from "@/lib/edgar";
import type { RatioSeriesPoint, TimeSeriesBundle } from "@/lib/analysis";
import type {
  DerivedMetricKey,
  DerivedMetricSeries,
  ExtendedMetricsBundle,
  TrendDetectionInput,
} from "@/lib/metrics";
import {
  DEFAULT_TREND_CONFIG,
  detectDirectional,
  detectDivergence,
} from "@/lib/metrics";

// ── Stub builders ─────────────────────────────────────────────────────────────

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
    annual: points.map((p) => ({ periodEnd: p.periodEnd, frequency: "annual" as const, value: p.value })),
    quarterly: [],
  };
}

/** Build a minimal annual MetricSeries with the given values. */
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

/** Build a minimal annual RatioSeriesPoint array. */
function annualRatioPoints(
  points: Array<{ periodEnd: string; value: number }>,
): RatioSeriesPoint[] {
  return points.map((p) => ({ periodEnd: p.periodEnd, frequency: "annual" as const, value: p.value }));
}

/** Build a minimal quarterly RatioSeriesPoint array. */
function quarterlyRatioPoints(
  points: Array<{ periodEnd: string; value: number }>,
): RatioSeriesPoint[] {
  return points.map((p) => ({ periodEnd: p.periodEnd, frequency: "quarterly" as const, value: p.value }));
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
): TrendDetectionInput {
  return { timeSeries, metricsBundle: { ...EMPTY_BUNDLE, ...bundleOverrides } };
}

// ── T2-a: Receivables outpacing revenue ──────────────────────────────────────

describe("T2-a: receivables_outpacing_revenue divergence", () => {
  it("flags when AR grows 50% while revenue grows only 5% (outpacing by 45pp)", () => {
    const timeSeries = makeTimeSeries({
      AccountsReceivableNetCurrent: annualMetricSeries("AccountsReceivableNetCurrent", [
        { periodEnd: "2023-12-31", value: 100_000_000 },
        { periodEnd: "2024-12-31", value: 150_000_000 }, // +50%
      ]),
      [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
        { periodEnd: "2023-12-31", value: 1_000_000_000 },
        { periodEnd: "2024-12-31", value: 1_050_000_000 }, // +5%
      ]),
    });

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "receivables_outpacing_revenue");

    expect(flag).toBeDefined();
    expect(flag!.frequency).toBe("annual");
    // outpacing = 0.50 - 0.05 = 0.45; maxOutpacing >= 0.30 → high
    expect(flag!.severity).toBe("high");
    expect(flag!.start_period).toBe("2024-12-31");
    expect(flag!.end_period).toBe("2024-12-31");
  });

  it("does NOT flag when AR and revenue grow at the same rate", () => {
    const timeSeries = makeTimeSeries({
      AccountsReceivableNetCurrent: annualMetricSeries("AccountsReceivableNetCurrent", [
        { periodEnd: "2023-12-31", value: 100_000_000 },
        { periodEnd: "2024-12-31", value: 110_000_000 }, // +10%
      ]),
      [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
        { periodEnd: "2023-12-31", value: 1_000_000_000 },
        { periodEnd: "2024-12-31", value: 1_100_000_000 }, // +10%
      ]),
    });

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "receivables_outpacing_revenue");

    expect(flag).toBeUndefined();
  });
});

// ── T1: Run-length threshold ──────────────────────────────────────────────────

describe("T1: directional run-length threshold (minRunLength=3 data points)", () => {
  it("detects a trend when gross_margin declines across 3 consecutive data points", () => {
    // 3 data points, all declining: run_length=3 >= minRunLength=3
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2022-12-31", value: 0.50 },
          { periodEnd: "2023-12-31", value: 0.45 },
          { periodEnd: "2024-12-31", value: 0.40 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find((t) => t.metric === "gross_margin" && t.direction === "down");

    expect(trend).toBeDefined();
    expect(trend!.run_length).toBe(3);
    expect(trend!.direction).toBe("down");
  });

  it("does NOT produce a trend when only 2 data points are in the series (run_length < minRunLength)", () => {
    // 2 data points: run_length=2 < minRunLength=3, so early-exit returns nothing
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2023-12-31", value: 0.50 },
          { periodEnd: "2024-12-31", value: 0.40 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find((t) => t.metric === "gross_margin" && t.direction === "down");

    expect(trend).toBeUndefined();
  });
});

// ── T2-c: Earnings quality gap ────────────────────────────────────────────────

describe("T2-c: earnings_quality_gap divergence", () => {
  it("flags when net income rises 2+ consecutive periods while FCF is flat or declining", () => {
    const timeSeries = makeTimeSeries({
      NetIncomeLoss: annualMetricSeries("NetIncomeLoss", [
        { periodEnd: "2022-12-31", value: 100_000_000 },
        { periodEnd: "2023-12-31", value: 150_000_000 }, // +50%
        { periodEnd: "2024-12-31", value: 200_000_000 }, // +33%
      ]),
    });

    const bundleOverrides: Partial<ExtendedMetricsBundle> = {
      cashFlowQuality: {
        ...EMPTY_BUNDLE.cashFlowQuality,
        freeCashFlow: annualDerived("free_cash_flow", [
          { periodEnd: "2022-12-31", value: 80_000_000 },
          { periodEnd: "2023-12-31", value: 70_000_000 }, // declining
          { periodEnd: "2024-12-31", value: 65_000_000 }, // declining
        ]),
      },
    };

    const result = detectDivergence(makeInput(timeSeries, bundleOverrides), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "earnings_quality_gap");

    expect(flag).toBeDefined();
    expect(flag!.frequency).toBe("annual");
    // count=2 consecutive periods, totalMag = Δ50M + Δ50M = 100M >> 0.30 threshold → high
    expect(flag!.severity).toBe("high");
    expect(flag!.start_period).toBe("2022-12-31");
    expect(flag!.end_period).toBe("2024-12-31");
  });

  it("does NOT flag when net income and FCF both rise together", () => {
    const timeSeries = makeTimeSeries({
      NetIncomeLoss: annualMetricSeries("NetIncomeLoss", [
        { periodEnd: "2022-12-31", value: 100_000_000 },
        { periodEnd: "2023-12-31", value: 150_000_000 },
        { periodEnd: "2024-12-31", value: 200_000_000 },
      ]),
    });

    const bundleOverrides: Partial<ExtendedMetricsBundle> = {
      cashFlowQuality: {
        ...EMPTY_BUNDLE.cashFlowQuality,
        freeCashFlow: annualDerived("free_cash_flow", [
          { periodEnd: "2022-12-31", value: 80_000_000 },
          { periodEnd: "2023-12-31", value: 120_000_000 }, // rising with NI
          { periodEnd: "2024-12-31", value: 160_000_000 }, // rising with NI
        ]),
      },
    };

    const result = detectDivergence(makeInput(timeSeries, bundleOverrides), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "earnings_quality_gap");

    expect(flag).toBeUndefined();
  });
});

// ── T5: Single-spike is NOT a trend ──────────────────────────────────────────

describe("T5: single-spike isolation — one jump is not a trend", () => {
  it("does not produce a directional trend for an isolated up-spike (down-spike-down pattern)", () => {
    // Pattern: down, isolated spike up, then back down — each run is only 2 points.
    // No sustained run of >= 3 data points in any single direction.
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2021-12-31", value: 0.50 },
          { periodEnd: "2022-12-31", value: 0.45 }, // down 1
          { periodEnd: "2023-12-31", value: 0.55 }, // isolated spike up
          { periodEnd: "2024-12-31", value: 0.40 }, // back down
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    // Each sub-run is only 2 data points long, below minRunLength=3 → no trends
    const anyTrend = result.find((t) => t.metric === "gross_margin" && t.run_length >= 3);

    expect(anyTrend).toBeUndefined();
  });

  it("flags only the outpacing year when AR spikes then fully reverts the following period", () => {
    // AR spikes in 2024 (outpacing by 99pp) but reverts in 2025 (negative AR growth).
    // The second transition (2024→2025) is skipped because arGrowth <= 0.
    // The divergence is flagged for 2024 only; end_period must not bleed into 2025.
    const timeSeries = makeTimeSeries({
      AccountsReceivableNetCurrent: annualMetricSeries("AccountsReceivableNetCurrent", [
        { periodEnd: "2023-12-31", value: 100_000_000 },
        { periodEnd: "2024-12-31", value: 200_000_000 }, // +100% spike
        { periodEnd: "2025-12-31", value: 105_000_000 }, // reverts: −47.5%, not checked
      ]),
      [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
        { periodEnd: "2023-12-31", value: 1_000_000_000 },
        { periodEnd: "2024-12-31", value: 1_010_000_000 }, // +1%
        { periodEnd: "2025-12-31", value: 1_100_000_000 }, // +9%
      ]),
    });

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "receivables_outpacing_revenue");

    // Single-period AR divergence IS flagged (cross-metric signal; no min-consecutive required).
    expect(flag).toBeDefined();
    // Must cover only the spike year — the reverting year must not extend end_period.
    expect(flag!.start_period).toBe("2024-12-31");
    expect(flag!.end_period).toBe("2024-12-31");
  });
});

// ── T4: Severity ranking ──────────────────────────────────────────────────────

describe("T4: severity ranking by magnitude and duration", () => {
  it("assigns 'high' severity to a long-duration large-magnitude declining trend", () => {
    // 6 consecutive declining periods with large total swing → high severity
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2019-12-31", value: 0.60 },
          { periodEnd: "2020-12-31", value: 0.52 },
          { periodEnd: "2021-12-31", value: 0.44 },
          { periodEnd: "2022-12-31", value: 0.36 },
          { periodEnd: "2023-12-31", value: 0.28 },
          { periodEnd: "2024-12-31", value: 0.20 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find((t) => t.metric === "gross_margin" && t.direction === "down");

    expect(trend).toBeDefined();
    expect(trend!.severity).toBe("high");
    expect(trend!.run_length).toBe(6);
    // end_value(0.20) − start_value(0.60) = −0.40
    expect(trend!.magnitude).toBeCloseTo(-0.40, 2);
  });

  it("assigns 'low' severity to a short small-magnitude run", () => {
    // 3 consecutive declines with tiny swing (1% total)
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2022-12-31", value: 0.500 },
          { periodEnd: "2023-12-31", value: 0.497 },
          { periodEnd: "2024-12-31", value: 0.494 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find((t) => t.metric === "gross_margin" && t.direction === "down");

    expect(trend).toBeDefined();
    expect(trend!.severity).toBe("low");
    expect(trend!.run_length).toBe(3);
    // end_value(0.494) − start_value(0.500) = −0.006
    expect(trend!.magnitude).toBeCloseTo(-0.006, 3);
  });
});

// ── T6: Quarterly-frequency directional trend ─────────────────────────────────

describe("T6: quarterly-frequency directional trend detection", () => {
  it("detects a declining gross_margin trend across 3 consecutive quarterly periods", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: quarterlyRatioPoints([
          { periodEnd: "2024-03-31", value: 0.45 },
          { periodEnd: "2024-06-30", value: 0.42 },
          { periodEnd: "2024-09-30", value: 0.39 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find(
      (t) => t.metric === "gross_margin" && t.direction === "down" && t.frequency === "quarterly",
    );

    expect(trend).toBeDefined();
    expect(trend!.run_length).toBe(3);
    expect(trend!.frequency).toBe("quarterly");
    expect(trend!.start_period).toBe("2024-03-31");
    expect(trend!.end_period).toBe("2024-09-30");
  });

  it("does NOT detect a quarterly trend when only 2 quarterly data points are present", () => {
    const timeSeries = makeTimeSeries(
      {},
      {
        gross_margin: quarterlyRatioPoints([
          { periodEnd: "2024-03-31", value: 0.45 },
          { periodEnd: "2024-06-30", value: 0.40 },
        ]),
      },
    );

    const result = detectDirectional(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const trend = result.find(
      (t) => t.metric === "gross_margin" && t.direction === "down" && t.frequency === "quarterly",
    );

    expect(trend).toBeUndefined();
  });
});

// ── T7: Revenue growth with margin compression ────────────────────────────────

describe("T7: revenue_growth_margin_compression divergence", () => {
  it("flags when revenue grows and gross margin compresses for 2+ consecutive periods", () => {
    // Revenue grows ~6% each year; gross margin compresses 1pp each year.
    const timeSeries = makeTimeSeries(
      {
        [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
          { periodEnd: "2022-12-31", value: 1_000_000_000 },
          { periodEnd: "2023-12-31", value: 1_060_000_000 }, // +6%
          { periodEnd: "2024-12-31", value: 1_124_000_000 }, // +6%
        ]),
      },
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2022-12-31", value: 0.40 },
          { periodEnd: "2023-12-31", value: 0.39 }, // −1pp compression
          { periodEnd: "2024-12-31", value: 0.38 }, // −1pp compression
        ]),
      },
    );

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "revenue_growth_margin_compression");

    expect(flag).toBeDefined();
    expect(flag!.frequency).toBe("annual");
    // count=2, totalMag=0.02 (ratio units): count>=2 && <4, totalMag<0.10 → med
    expect(flag!.severity).toBe("med");
    expect(flag!.start_period).toBe("2022-12-31");
    expect(flag!.end_period).toBe("2024-12-31");
  });

  it("does NOT flag when gross margin expands alongside revenue growth", () => {
    const timeSeries = makeTimeSeries(
      {
        [REVENUE_CONCEPT]: annualMetricSeries(REVENUE_CONCEPT, [
          { periodEnd: "2022-12-31", value: 1_000_000_000 },
          { periodEnd: "2023-12-31", value: 1_060_000_000 },
          { periodEnd: "2024-12-31", value: 1_124_000_000 },
        ]),
      },
      {
        gross_margin: annualRatioPoints([
          { periodEnd: "2022-12-31", value: 0.40 },
          { periodEnd: "2023-12-31", value: 0.41 }, // expanding
          { periodEnd: "2024-12-31", value: 0.42 }, // expanding
        ]),
      },
    );

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "revenue_growth_margin_compression");

    expect(flag).toBeUndefined();
  });
});

// ── T8: Creeping dilution ─────────────────────────────────────────────────────

describe("T8: creeping_dilution divergence", () => {
  it("flags when diluted share count rises in 3+ consecutive annual periods", () => {
    // Share count grows ~2% each year for 3 consecutive years (4 data points = 3 transitions).
    const timeSeries = makeTimeSeries({
      WeightedAverageNumberOfDilutedSharesOutstanding: annualMetricSeries(
        "WeightedAverageNumberOfDilutedSharesOutstanding",
        [
          { periodEnd: "2022-12-31", value: 100_000_000 },
          { periodEnd: "2023-12-31", value: 102_000_000 }, // +2%
          { periodEnd: "2024-12-31", value: 104_040_000 }, // +2%
          { periodEnd: "2025-12-31", value: 106_120_800 }, // +2%
        ],
      ),
    });

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "creeping_dilution");

    expect(flag).toBeDefined();
    expect(flag!.frequency).toBe("annual");
    // count=3 transitions, totalMag≈0.06 → count>=2 && <4, totalMag<0.30 → med
    expect(flag!.severity).toBe("med");
    expect(flag!.start_period).toBe("2022-12-31");
    expect(flag!.end_period).toBe("2025-12-31");
  });

  it("does NOT flag when share count is flat or decreasing", () => {
    const timeSeries = makeTimeSeries({
      WeightedAverageNumberOfDilutedSharesOutstanding: annualMetricSeries(
        "WeightedAverageNumberOfDilutedSharesOutstanding",
        [
          { periodEnd: "2022-12-31", value: 100_000_000 },
          { periodEnd: "2023-12-31", value: 99_000_000 },  // −1% buyback
          { periodEnd: "2024-12-31", value: 98_000_000 },  // −1% buyback
          { periodEnd: "2025-12-31", value: 97_000_000 },  // −1% buyback
        ],
      ),
    });

    const result = detectDivergence(makeInput(timeSeries), DEFAULT_TREND_CONFIG);
    const flag = result.find((p) => p.name === "creeping_dilution");

    expect(flag).toBeUndefined();
  });
});
