import {
  alignTargetSeries,
  collectPeerPointsByKey,
  frequencyFromKey,
} from "@/lib/peers/align-periods";
import type {
  ChartBundle,
  PeerBandPoint,
  PeerExtraction,
  PercentilePoint,
  RelativeMetricSeries,
  TargetPeriodPoint,
} from "@/lib/peers/types";

// ── Statistics helpers ───────────────────────────────────────────────────────

/** Compute the median of a non-empty sorted-or-unsorted number array. */
export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Percentile rank: what fraction of peer values is strictly below target?
 * 0–100. If peerValues is empty, returns 50 (neutral).
 * A target equal to the peer median returns ~50.
 */
export function computePercentileRank(targetValue: number, peerValues: number[]): number {
  if (peerValues.length === 0) return 50;
  const below = peerValues.filter((v) => v < targetValue).length;
  return Math.round((below / peerValues.length) * 100);
}

// ── Core computation ─────────────────────────────────────────────────────────

/**
 * P4: Compute relative metrics for one metric key.
 *
 * For each calendar period where the target has a value:
 *   - Collect peer values (P6: missing peers excluded, not zeroed).
 *   - Compute peer min / median / max.
 *   - Compute target percentile rank vs peers.
 */
export function computeRelativeForMetric(
  metricKey: string,
  targetChart: ChartBundle,
  peerExtractions: PeerExtraction[],
): RelativeMetricSeries {
  const target: TargetPeriodPoint[] = alignTargetSeries(metricKey, targetChart);
  const peerByKey = collectPeerPointsByKey(metricKey, peerExtractions);

  const peerBand: PeerBandPoint[] = [];
  const percentileRank: PercentilePoint[] = [];

  for (const tp of target) {
    const peerPoints = peerByKey.get(tp.calendarKey) ?? [];
    const peerValues = peerPoints.map((p) => p.value);

    peerBand.push({
      calendarKey: tp.calendarKey,
      periodEnd: tp.periodEnd,
      frequency: frequencyFromKey(tp.calendarKey),
      peerCount: peerPoints.length,
      min: peerValues.length > 0 ? Math.min(...peerValues) : null,
      median: peerValues.length > 0 ? computeMedian(peerValues) : null,
      max: peerValues.length > 0 ? Math.max(...peerValues) : null,
      peers: peerPoints,
    });

    percentileRank.push({
      calendarKey: tp.calendarKey,
      rank: peerValues.length > 0 ? computePercentileRank(tp.value, peerValues) : null,
    });
  }

  return { metricKey, target, peerBand, percentileRank };
}

/**
 * P4: Compute relative metrics for all metric keys that the target reports.
 */
export function computeRelativeMetrics(
  targetChart: ChartBundle,
  peerExtractions: PeerExtraction[],
): RelativeMetricSeries[] {
  const metricKeys = Object.keys(targetChart);
  return metricKeys.map((key) =>
    computeRelativeForMetric(key, targetChart, peerExtractions),
  );
}
