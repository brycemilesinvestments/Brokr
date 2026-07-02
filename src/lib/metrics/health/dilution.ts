/**
 * H1 — Dilution sub-score.
 * Inputs: SBC as % of revenue, share count YoY trend.
 * Both values are decimal ratios from ExtendedMetricsBundle.dilution.
 */
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  SBC_PCT_REVENUE_BREAKPOINTS,
  SHARE_COUNT_TREND_BREAKPOINTS,
} from "@/lib/metrics/health/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";
import type { DilutionMetrics } from "@/lib/metrics/types";

function derivedAt(
  points: ReadonlyArray<{ periodEnd: string; frequency: SeriesFrequency; value?: number }>,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return points.find((p) => p.periodEnd === periodEnd && p.frequency === frequency)?.value;
}

/** Compute the Dilution sub-score for a single period. */
export function computeDilutionSubScore(
  dilution: DilutionMetrics,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const sbcPoints = frequency === "annual"
    ? dilution.sbcPctRevenue.annual
    : dilution.sbcPctRevenue.quarterly;

  const sharePoints = frequency === "annual"
    ? dilution.shareCountTrend.annual
    : dilution.shareCountTrend.quarterly;

  const sbcPct = derivedAt(sbcPoints, periodEnd, frequency);
  const shareCountTrend = derivedAt(sharePoints, periodEnd, frequency);

  const sbcScore =
    sbcPct !== undefined ? piecewiseScore(sbcPct, SBC_PCT_REVENUE_BREAKPOINTS) : undefined;

  const shareScore =
    shareCountTrend !== undefined
      ? piecewiseScore(shareCountTrend, SHARE_COUNT_TREND_BREAKPOINTS)
      : undefined;

  const score = clampScore(
    weightedAverage([
      [sbcScore, 0.50],
      [shareScore, 0.50],
    ]),
  );

  const inputs: DrivingMetric[] = [
    {
      metricKey: "sbc_pct_revenue",
      label: "SBC % of Revenue",
      value: sbcPct,
      drillDownPath: "/company/{cik}/metrics#sbc_pct_revenue",
    },
    {
      metricKey: "share_count_trend",
      label: "Share Count YoY Change",
      value: shareCountTrend,
      drillDownPath: "/company/{cik}/metrics#share_count_trend",
    },
  ];

  return { key: "dilution", score, inputs };
}
