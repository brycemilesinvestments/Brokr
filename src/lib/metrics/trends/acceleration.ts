import type { RatioSeriesKey } from "@/lib/analysis";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  DIRECTIONAL_RATIO_KEYS,
  extractDerivedPoints,
  extractRatioPoints,
} from "@/lib/metrics/trends/directional";
import type {
  AccelerationSignal,
  DirectionalTrend,
  TrendDetectionInput,
} from "@/lib/metrics/trends/types";

type ValuePoint = { periodEnd: string; value: number };

const DERIVED_KEYS = new Set(["fcf_margin", "dso", "sbc_pct_revenue", "share_count_trend"]);

/** Look up the ordered value points for a trend's metric over its run window. */
function getRunValuePoints(
  trend: DirectionalTrend,
  input: TrendDetectionInput,
): ValuePoint[] {
  const { metric, frequency, start_period, end_period } = trend;
  const { timeSeries, metricsBundle } = input;

  const inWindow = (periodEnd: string) =>
    periodEnd >= start_period && periodEnd <= end_period;

  if ((DIRECTIONAL_RATIO_KEYS as readonly string[]).includes(metric)) {
    return extractRatioPoints(
      timeSeries.ratioSeries,
      metric as RatioSeriesKey,
      frequency as SeriesFrequency,
    ).filter((p) => inWindow(p.periodEnd));
  }

  if (DERIVED_KEYS.has(metric)) {
    const derivedMap: Record<
      string,
      (input: TrendDetectionInput) => ReturnType<typeof extractDerivedPoints>
    > = {
      fcf_margin: (i) => extractDerivedPoints(i.metricsBundle.cashFlowQuality.fcfMargin, frequency as SeriesFrequency),
      dso: (i) => extractDerivedPoints(i.metricsBundle.workingCapital.dso, frequency as SeriesFrequency),
      sbc_pct_revenue: (i) => extractDerivedPoints(i.metricsBundle.dilution.sbcPctRevenue, frequency as SeriesFrequency),
      share_count_trend: (i) => extractDerivedPoints(i.metricsBundle.dilution.shareCountTrend, frequency as SeriesFrequency),
    };
    return (derivedMap[metric]?.(input) ?? []).filter((p) => inWindow(p.periodEnd));
  }

  return [];
}

/**
 * Computes the acceleration signal for a run using second differences of the value series.
 * "Accelerating" = magnitude of period-to-period changes is increasing.
 * "Decelerating" = magnitude of changes is decreasing.
 * Returns undefined when there are fewer than 3 value points (no second difference possible).
 */
function computeAcceleration(
  points: ValuePoint[],
  direction: DirectionalTrend["direction"],
): AccelerationSignal | undefined {
  if (points.length < 3) return undefined;

  const firstDiffs = points
    .slice(1)
    .map((p, i) => p.value - points[i].value);

  if (firstDiffs.length < 2) return undefined;

  const secondDiffs = firstDiffs.slice(1).map((d, i) => d - firstDiffs[i]);

  const positiveCount = secondDiffs.filter((d) => d > 0).length;
  const negativeCount = secondDiffs.filter((d) => d < 0).length;

  if (positiveCount === negativeCount) return undefined;

  const majorityPositive = positiveCount > negativeCount;

  // For "up" trend: positive second differences = bigger steps = accelerating
  // For "down" trend: negative second differences = more negative steps = accelerating
  const isAccelerating =
    direction === "up" ? majorityPositive : !majorityPositive;

  return {
    direction: isAccelerating ? "accelerating" : "decelerating",
    startPeriod: points[0].periodEnd,
    endPeriod: points[points.length - 1].periodEnd,
  };
}

/** Attaches acceleration signals to directional trends that have >= 3 run points. */
export function detectAcceleration(
  trends: DirectionalTrend[],
  input: TrendDetectionInput,
): DirectionalTrend[] {
  return trends.map((trend) => {
    const points = getRunValuePoints(trend, input);
    const acceleration = computeAcceleration(points, trend.direction);
    if (!acceleration) return trend;
    return { ...trend, acceleration };
  });
}
