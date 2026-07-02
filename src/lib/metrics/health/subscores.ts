/**
 * Five sub-score calculators (H1, H2).
 * Each is a pure function: same inputs → same output, no I/O.
 * All margin/ratio values are decimals (e.g. 0.15 = 15 %).
 */

import type { RatioSeriesKey, RatioSeriesPoint } from "@/lib/analysis";
import type { MetricSeriesBundle, SeriesFrequency } from "@/lib/edgar/time-series";
import { REVENUE_CONCEPT } from "@/lib/metrics/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { Breakpoint } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";
import type { DerivedMetricSeries, DilutionMetrics } from "@/lib/metrics/types";

// ── Low-level extractors ───────────────────────────────────────────────────────

function getRatioValue(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  key: RatioSeriesKey,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return ratioSeries[key].find(
    (p) => p.periodEnd === periodEnd && p.frequency === frequency,
  )?.value;
}

function getDerivedValue(
  series: DerivedMetricSeries,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  const pts = frequency === "annual" ? series.annual : series.quarterly;
  return pts.find((p) => p.periodEnd === periodEnd)?.value;
}

/**
 * Sequential revenue growth rate at a period (current vs prior entry in the series).
 * Annual data → YoY; quarterly data → QoQ.
 */
function getRevenueGrowthRate(
  metrics: MetricSeriesBundle,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  const rev = metrics.series[REVENUE_CONCEPT];
  if (!rev || rev.status === "not_reported") return undefined;

  const pts = (frequency === "annual" ? rev.annual : rev.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const idx = pts.findIndex((p) => p.periodEnd === periodEnd);
  if (idx < 1) return undefined;

  const current = pts[idx].value;
  const prior = pts[idx - 1].value;
  if (current === undefined || prior === undefined || prior === 0) return undefined;
  return (current - prior) / Math.abs(prior);
}

/**
 * Period-over-period dilution rate from the share count trend series
 * (shareCountTrend stores absolute diluted share count).
 * Negative = buyback (good); positive = dilution (bad).
 */
function getShareDilutionRate(
  shareCountTrend: DerivedMetricSeries,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  const pts = (frequency === "annual" ? shareCountTrend.annual : shareCountTrend.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const idx = pts.findIndex((p) => p.periodEnd === periodEnd);
  if (idx < 1) return undefined;

  const current = pts[idx].value;
  const prior = pts[idx - 1].value;
  if (current === undefined || prior === undefined || prior === 0) return undefined;
  return (current - prior) / Math.abs(prior);
}

// ── Breakpoints ────────────────────────────────────────────────────────────────

const NET_MARGIN_BP: Breakpoint[] = [
  [-0.5, 0], [-0.1, 15], [0, 30], [0.05, 50], [0.1, 65], [0.2, 82], [0.35, 100],
];

const OP_MARGIN_BP: Breakpoint[] = [
  [-0.3, 0], [0, 35], [0.05, 52], [0.1, 65], [0.2, 82], [0.35, 100],
];

const GROSS_MARGIN_BP: Breakpoint[] = [
  [0, 5], [0.2, 30], [0.4, 55], [0.6, 78], [0.8, 100],
];

const REVENUE_GROWTH_BP: Breakpoint[] = [
  [-0.3, 0], [-0.1, 15], [0, 30], [0.05, 50], [0.1, 65], [0.2, 82], [0.5, 100],
];

const FCF_MARGIN_BP: Breakpoint[] = [
  [-0.3, 0], [-0.1, 15], [0, 35], [0.05, 52], [0.1, 68], [0.2, 85], [0.35, 100],
];

const CURRENT_RATIO_BP: Breakpoint[] = [
  [0, 0], [0.5, 10], [1, 40], [1.5, 65], [2, 80], [3, 92], [5, 100],
];

/**
 * Debt-to-equity breakpoints.
 * Lower D/E → higher score. Negative D/E (negative equity) → mapped to 100
 * so we don't penalize healthy net-cash companies with technical D/E < 0.
 */
const DEBT_TO_EQUITY_BP: Breakpoint[] = [
  [-5, 100], [0, 90], [0.5, 75], [1, 60], [2, 40], [4, 15], [10, 0],
];

const SBC_PCT_BP: Breakpoint[] = [
  [0, 100], [0.01, 95], [0.02, 88], [0.05, 72], [0.1, 50], [0.15, 30], [0.25, 10], [0.5, 0],
];

const DILUTION_RATE_BP: Breakpoint[] = [
  [-0.05, 100], [0, 90], [0.01, 78], [0.02, 65], [0.05, 45], [0.1, 20], [0.2, 0],
];

// ── H1 sub-score calculators ──────────────────────────────────────────────────

/**
 * Profitability sub-score.
 * Inputs: net_margin (40 %), operating_margin (35 %), gross_margin (25 %).
 */
export function computeProfitabilityScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const netMargin = getRatioValue(ratioSeries, "net_margin", periodEnd, frequency);
  const opMargin = getRatioValue(ratioSeries, "operating_margin", periodEnd, frequency);
  const grossMargin = getRatioValue(ratioSeries, "gross_margin", periodEnd, frequency);

  const netScore = netMargin !== undefined ? piecewiseScore(netMargin, NET_MARGIN_BP) : undefined;
  const opScore = opMargin !== undefined ? piecewiseScore(opMargin, OP_MARGIN_BP) : undefined;
  const grossScore = grossMargin !== undefined ? piecewiseScore(grossMargin, GROSS_MARGIN_BP) : undefined;

  const inputs: DrivingMetric[] = [
    {
      metricKey: "net_margin",
      label: "Net Margin",
      value: netMargin,
      drillDownPath: "/company/{cik}/metrics#net_margin",
    },
    {
      metricKey: "operating_margin",
      label: "Operating Margin",
      value: opMargin,
      drillDownPath: "/company/{cik}/metrics#operating_margin",
    },
    {
      metricKey: "gross_margin",
      label: "Gross Margin",
      value: grossMargin,
      drillDownPath: "/company/{cik}/metrics#gross_margin",
    },
  ];

  return {
    key: "profitability",
    score: clampScore(weightedAverage([[netScore, 40], [opScore, 35], [grossScore, 25]])),
    inputs,
  };
}

/**
 * Growth quality sub-score.
 * Inputs: revenue growth rate (60 %), FCF margin (40 %).
 */
export function computeGrowthQualityScore(
  metrics: MetricSeriesBundle,
  fcfMargin: DerivedMetricSeries,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const revenueGrowth = getRevenueGrowthRate(metrics, periodEnd, frequency);
  const fcf = getDerivedValue(fcfMargin, periodEnd, frequency);

  const growthScore = revenueGrowth !== undefined
    ? piecewiseScore(revenueGrowth, REVENUE_GROWTH_BP)
    : undefined;
  const fcfScore = fcf !== undefined ? piecewiseScore(fcf, FCF_MARGIN_BP) : undefined;

  const inputs: DrivingMetric[] = [
    {
      metricKey: "revenue_growth_rate",
      label: "Revenue Growth Rate",
      value: revenueGrowth,
      drillDownPath: "/company/{cik}/metrics#revenue_growth_rate",
    },
    {
      metricKey: "fcf_margin",
      label: "FCF Margin",
      value: fcf,
      drillDownPath: "/company/{cik}/metrics#fcf_margin",
    },
  ];

  return {
    key: "growth_quality",
    score: clampScore(weightedAverage([[growthScore, 60], [fcfScore, 40]])),
    inputs,
  };
}

/**
 * Balance-sheet strength sub-score.
 * Inputs: current_ratio (40 %), debt_to_equity (60 %).
 */
export function computeBalanceSheetScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const currentRatio = getRatioValue(ratioSeries, "current_ratio", periodEnd, frequency);
  const debtToEquity = getRatioValue(ratioSeries, "debt_to_equity", periodEnd, frequency);

  const currentScore = currentRatio !== undefined
    ? piecewiseScore(currentRatio, CURRENT_RATIO_BP)
    : undefined;
  const debtScore = debtToEquity !== undefined
    ? piecewiseScore(debtToEquity, DEBT_TO_EQUITY_BP)
    : undefined;

  const inputs: DrivingMetric[] = [
    {
      metricKey: "current_ratio",
      label: "Current Ratio",
      value: currentRatio,
      drillDownPath: "/company/{cik}/metrics#current_ratio",
    },
    {
      metricKey: "debt_to_equity",
      label: "Debt-to-Equity",
      value: debtToEquity,
      drillDownPath: "/company/{cik}/metrics#debt_to_equity",
    },
  ];

  return {
    key: "balance_sheet",
    score: clampScore(weightedAverage([[currentScore, 40], [debtScore, 60]])),
    inputs,
  };
}

/**
 * Cash generation sub-score.
 * Inputs: FCF margin (70 %), operating_margin (30 %).
 */
export function computeCashGenerationScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  fcfMargin: DerivedMetricSeries,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const fcf = getDerivedValue(fcfMargin, periodEnd, frequency);
  const opMargin = getRatioValue(ratioSeries, "operating_margin", periodEnd, frequency);

  const fcfScore = fcf !== undefined ? piecewiseScore(fcf, FCF_MARGIN_BP) : undefined;
  const opScore = opMargin !== undefined ? piecewiseScore(opMargin, OP_MARGIN_BP) : undefined;

  const inputs: DrivingMetric[] = [
    {
      metricKey: "fcf_margin",
      label: "FCF Margin",
      value: fcf,
      drillDownPath: "/company/{cik}/metrics#fcf_margin",
    },
    {
      metricKey: "operating_margin",
      label: "Operating Margin",
      value: opMargin,
      drillDownPath: "/company/{cik}/metrics#operating_margin",
    },
  ];

  return {
    key: "cash_generation",
    score: clampScore(weightedAverage([[fcfScore, 70], [opScore, 30]])),
    inputs,
  };
}

/**
 * Dilution sub-score.
 * Inputs: SBC % of revenue (70 %), share count dilution rate (30 %).
 * Lower dilution → higher score.
 */
export function computeDilutionScore(
  dilution: DilutionMetrics,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const sbcPct = getDerivedValue(dilution.sbcPctRevenue, periodEnd, frequency);
  const dilutionRate = getShareDilutionRate(dilution.shareCountTrend, periodEnd, frequency);

  const sbcScore = sbcPct !== undefined ? piecewiseScore(sbcPct, SBC_PCT_BP) : undefined;
  const dilScore = dilutionRate !== undefined ? piecewiseScore(dilutionRate, DILUTION_RATE_BP) : undefined;

  const inputs: DrivingMetric[] = [
    {
      metricKey: "sbc_pct_revenue",
      label: "SBC % of Revenue",
      value: sbcPct,
      drillDownPath: "/company/{cik}/metrics#sbc_pct_revenue",
    },
    {
      metricKey: "share_count_dilution_rate",
      label: "Share Count Dilution Rate",
      value: dilutionRate,
      drillDownPath: "/company/{cik}/metrics#share_count_trend",
    },
  ];

  return {
    key: "dilution",
    score: clampScore(weightedAverage([[sbcScore, 70], [dilScore, 30]])),
    inputs,
  };
}
