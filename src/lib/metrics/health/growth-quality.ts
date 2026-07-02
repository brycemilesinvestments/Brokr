/**
 * H1 — Growth Quality sub-score.
 * Inputs: revenue YoY growth rate (pre-computed per period), operating_margin.
 * Revenue growth is pre-computed once for the full series to avoid redundant iteration.
 */
import type { RatioSeriesKey, RatioSeriesPoint } from "@/lib/analysis/time-series/types";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import type { MetricSeries } from "@/lib/edgar/time-series";
import {
  GROWTH_OPERATING_MARGIN_BREAKPOINTS,
  REVENUE_GROWTH_BREAKPOINTS,
} from "@/lib/metrics/health/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";

/**
 * Pre-compute revenue YoY growth rates for all annual periods in chronological order.
 * Returns a Map from periodEnd → growth rate (decimal).
 * Periods with no prior year data receive undefined.
 */
export function buildRevenueGrowthMap(revenueSeries: MetricSeries | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!revenueSeries || revenueSeries.status === "not_reported") return map;

  const sorted = [...revenueSeries.annual].sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd),
  );

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prior = sorted[i - 1];
    if (cur.value !== undefined && prior.value !== undefined && prior.value !== 0) {
      map.set(cur.periodEnd, (cur.value - prior.value) / Math.abs(prior.value));
    }
  }

  return map;
}

function ratioAt(
  series: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  key: RatioSeriesKey,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return series[key].find((p) => p.periodEnd === periodEnd && p.frequency === frequency)?.value;
}

/** Compute the Growth Quality sub-score for a single period. */
export function computeGrowthQualitySubScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  periodEnd: string,
  frequency: SeriesFrequency,
  revenueGrowthMap: Map<string, number>,
): SubScore {
  const revenueGrowth = revenueGrowthMap.get(periodEnd);
  const opMargin = ratioAt(ratioSeries, "operating_margin", periodEnd, frequency);

  const growthScore =
    revenueGrowth !== undefined ? piecewiseScore(revenueGrowth, REVENUE_GROWTH_BREAKPOINTS) : undefined;
  const opScore =
    opMargin !== undefined
      ? piecewiseScore(opMargin, GROWTH_OPERATING_MARGIN_BREAKPOINTS)
      : undefined;

  const score = clampScore(
    weightedAverage([
      [growthScore, 0.60],
      [opScore, 0.40],
    ]),
  );

  const inputs: DrivingMetric[] = [
    {
      metricKey: "revenue_growth_rate",
      label: "Revenue YoY Growth",
      value: revenueGrowth,
      drillDownPath: "/company/{cik}/metrics#revenue_growth",
    },
    {
      metricKey: "operating_margin",
      label: "Operating Margin (Quality Signal)",
      value: opMargin,
      drillDownPath: "/company/{cik}/metrics#operating_margin",
    },
  ];

  return { key: "growth_quality", score, inputs };
}
