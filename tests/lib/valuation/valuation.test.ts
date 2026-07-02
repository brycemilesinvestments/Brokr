import { describe, expect, it } from "vitest";
import { buildTimeSeriesBundle } from "@/lib/analysis";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import {
  alignPricesToFundamentals,
  balancePointAsOf,
  buildValuationBundle,
  computeEnterpriseValue,
  computeMultiples,
  computeTtmFundamentals,
  PE_NEGATIVE_EARNINGS_REASON,
  selectLatestFiledAsOf,
  toSingleQuarterFlows,
  toValuationChartBundle,
} from "@/lib/valuation";
import type { MetricSeries, MetricSeriesPoint } from "@/lib/edgar/time-series";
import type { NormalizedBar } from "@/lib/market";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";

function metricPoint(
  overrides: Partial<MetricSeriesPoint> & Pick<MetricSeriesPoint, "periodEnd" | "value" | "filed">,
): MetricSeriesPoint {
  return {
    form: "10-Q",
    accn: "test",
    unit: "USD",
    fp: "Q1",
    fy: 2026,
    ...overrides,
  };
}

function reportedSeries(concept: string, quarterly: MetricSeriesPoint[]): MetricSeries {
  return { concept, status: "reported", unit: "USD", annual: [], quarterly, gaps: [] };
}

function bar(date: string, close: number): NormalizedBar {
  return { date, open: close, high: close, low: close, close, volume: 1_000 };
}

describe("Valuation chunk", () => {
  const timeSeries = buildTimeSeriesBundle(sndkCompanyFacts as never);
  const metrics = buildExtendedMetricsBundle(timeSeries, sndkCompanyFacts as never);

  it("uses prior filing for price dates before 2026-05-01 (C8.4)", () => {
    const ttm = computeTtmFundamentals(
      timeSeries.metrics,
      sndkCompanyFacts as never,
      metrics.cashFlowQuality.freeCashFlow,
    );

    const beforeFiling = selectLatestFiledAsOf(ttm, "2026-04-30");
    const onFiling = selectLatestFiledAsOf(ttm, "2026-05-01");

    expect(beforeFiling?.filedDate).toBe("2026-01-30");
    expect(beforeFiling?.asOfPeriodEnd).toBe("2026-01-02");
    expect(onFiling?.filedDate).toBe("2026-05-01");
    expect(onFiling?.asOfPeriodEnd).toBe("2026-04-03");

    const evBefore = balancePointAsOf(
      timeSeries.metrics.series.CashAndCashEquivalentsAtCarryingValue,
      "2026-04-30",
    );
    const evOn = balancePointAsOf(
      timeSeries.metrics.series.CashAndCashEquivalentsAtCarryingValue,
      "2026-05-01",
    );
    expect(evBefore?.periodEnd).toBe("2026-01-02");
    expect(evOn?.periodEnd).toBe("2026-04-03");
  });

  it("returns null P/E with reason for negative TTM earnings (C8.3)", () => {
    const prices = [bar("2026-06-01", 100)];
    const ttm = [
      {
        asOfPeriodEnd: "2026-03-31",
        filedDate: "2026-04-15",
        netIncome: -50_000_000,
        sharesOutstanding: 1_000_000,
      },
    ];
    const ev = computeEnterpriseValue(prices, {
      cik: "1",
      entityName: "Test",
      series: {
        LongTermDebtNoncurrent: reportedSeries("LongTermDebtNoncurrent", [
          metricPoint({ periodEnd: "2026-03-31", value: 0, filed: "2026-04-15" }),
        ]),
        CashAndCashEquivalentsAtCarryingValue: reportedSeries(
          "CashAndCashEquivalentsAtCarryingValue",
          [metricPoint({ periodEnd: "2026-03-31", value: 0, filed: "2026-04-15" })],
        ),
        EntityCommonStockSharesOutstanding: reportedSeries(
          "EntityCommonStockSharesOutstanding",
          [metricPoint({ periodEnd: "2026-03-31", value: 1_000_000, filed: "2026-04-15" })],
        ),
      },
    });
    const multiples = computeMultiples(prices, ev, ttm);
    const aligned = alignPricesToFundamentals(prices, ttm, ev, multiples);

    expect(multiples.pe.points[0]?.value).toBeUndefined();
    expect(multiples.pe.points[0]?.nullReason).toBe(PE_NEGATIVE_EARNINGS_REASON);
    expect(aligned[0]?.nullReasons.pe).toBe(PE_NEGATIVE_EARNINGS_REASON);
  });

  it("computes EV below market cap when cash exceeds debt (C8.2)", () => {
    const prices = [bar("2026-05-15", 50)];
    const ev = computeEnterpriseValue(prices, timeSeries.metrics);
    const point = ev.points.find((p) => p.date === "2026-05-15");

    expect(point).toBeDefined();
    expect(point!.totalDebt).toBe(0);
    expect(point!.cash).toBe(3_735_000_000);
    expect(point!.enterpriseValue).toBeLessThan(point!.marketCap);
    expect(point!.enterpriseValue).toBe(point!.marketCap - point!.cash);
  });

  it("sums the last four single-quarter revenues for TTM (C8.1)", () => {
    const quarters = [
      metricPoint({ periodEnd: "2025-04-01", value: 100, filed: "2025-05-01", fp: "Q1", fy: 2025, start: "2025-01-01" }),
      metricPoint({ periodEnd: "2025-07-01", value: 250, filed: "2025-08-01", fp: "Q2", fy: 2025, start: "2025-01-01" }),
      metricPoint({ periodEnd: "2025-10-01", value: 400, filed: "2025-11-01", fp: "Q3", fy: 2025, start: "2025-01-01" }),
      metricPoint({ periodEnd: "2026-01-01", value: 550, filed: "2026-02-01", fp: "Q4", fy: 2025, start: "2025-01-01" }),
      metricPoint({ periodEnd: "2026-04-01", value: 700, filed: "2026-05-01", fp: "Q1", fy: 2026, start: "2026-01-01" }),
    ];

    const single = toSingleQuarterFlows(quarters);
    expect(single.get("2025-04-01")).toBe(100);
    expect(single.get("2025-07-01")).toBe(150);
    expect(single.get("2025-10-01")).toBe(150);
    expect(single.get("2026-01-01")).toBe(150);
    expect(single.get("2026-04-01")).toBe(700);

    const ttmRevenue = [...single.keys()]
      .filter((end) => end.localeCompare("2026-04-01") <= 0)
      .sort((a, b) => a.localeCompare(b))
      .slice(-4)
      .reduce((sum, end) => sum + (single.get(end) ?? 0), 0);
    expect(ttmRevenue).toBe(150 + 150 + 150 + 700);
  });

  it("emits ChartBundle-compatible output with gaps not zeros (C8.5)", () => {
    const prices = [bar("2026-06-01", 50)];
    const bundle = buildValuationBundle({
      cik: timeSeries.cik,
      symbol: "SNDK",
      prices,
      timeSeries,
      rawFacts: sndkCompanyFacts as never,
      metrics,
    });

    expect(bundle.chart.pe?.length).toBe(1);
    expect(bundle.chart.pe?.[0]?.y).toBeGreaterThan(0);

    const chart = toValuationChartBundle(bundle.multiples);
    const lossDays = bundle.multiples.pe.points.filter((p) => p.nullReason);
    for (const loss of lossDays) {
      expect(chart.pe?.some((p) => p.x === loss.date)).toBe(false);
    }
  });
});
