/**
 * H1 — Balance Sheet sub-score.
 * Inputs: current_ratio (liquidity), debt_to_equity (leverage).
 */
import type { RatioSeriesKey, RatioSeriesPoint } from "@/lib/analysis/time-series/types";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  CURRENT_RATIO_BREAKPOINTS,
  DEBT_TO_EQUITY_BREAKPOINTS,
} from "@/lib/metrics/health/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";

function ratioAt(
  series: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  key: RatioSeriesKey,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return series[key].find((p) => p.periodEnd === periodEnd && p.frequency === frequency)?.value;
}

/** Compute the Balance Sheet sub-score for a single period. */
export function computeBalanceSheetSubScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const currentRatio = ratioAt(ratioSeries, "current_ratio", periodEnd, frequency);
  const debtToEquity = ratioAt(ratioSeries, "debt_to_equity", periodEnd, frequency);

  const currentScore =
    currentRatio !== undefined ? piecewiseScore(currentRatio, CURRENT_RATIO_BREAKPOINTS) : undefined;

  const debtScore =
    debtToEquity !== undefined
      ? piecewiseScore(Math.max(0, debtToEquity), DEBT_TO_EQUITY_BREAKPOINTS)
      : undefined;

  const score = clampScore(
    weightedAverage([
      [currentScore, 0.50],
      [debtScore, 0.50],
    ]),
  );

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

  return { key: "balance_sheet", score, inputs };
}
