import type {
  DivergenceFlag,
  PeerBandPoint,
  RelativeMetricSeries,
  TargetPeriodPoint,
  Trend,
} from "@/lib/peers/types";

/** Threshold for classifying a period-over-period change as directional. */
const TREND_THRESHOLD = 0.05;

/**
 * P5: Compute the trend direction between two consecutive values.
 * "flat" if absolute relative change ≤ TREND_THRESHOLD.
 */
export function computeTrend(prev: number, curr: number): Trend {
  if (Math.abs(prev) < Number.EPSILON) {
    return curr > 0 ? "up" : curr < 0 ? "down" : "flat";
  }
  const delta = (curr - prev) / Math.abs(prev);
  if (delta > TREND_THRESHOLD) return "up";
  if (delta < -TREND_THRESHOLD) return "down";
  return "flat";
}

/**
 * P5: Detect divergences between target and peer-median trends.
 *
 * A divergence is flagged when the target moves in the opposite direction
 * from the peer median (e.g., target margin rising while peer median falls).
 * Requires at least two consecutive periods to compare.
 */
export function flagDivergences(relativeMetrics: RelativeMetricSeries[]): DivergenceFlag[] {
  const flags: DivergenceFlag[] = [];

  for (const series of relativeMetrics) {
    const { metricKey, target, peerBand } = series;

    if (target.length < 2 || peerBand.length < 2) continue;

    const targetByKey = new Map<string, TargetPeriodPoint>(
      target.map((t) => [t.calendarKey, t]),
    );
    const peerByKey = new Map<string, PeerBandPoint>(
      peerBand.map((b) => [b.calendarKey, b]),
    );

    // Walk consecutive calendar periods (sorted ascending)
    const keys = [...new Set([...targetByKey.keys(), ...peerByKey.keys()])].sort();

    for (let i = 1; i < keys.length; i++) {
      const prevKey = keys[i - 1];
      const currKey = keys[i];

      const prevTarget = targetByKey.get(prevKey);
      const currTarget = targetByKey.get(currKey);
      const prevPeer = peerByKey.get(prevKey);
      const currPeer = peerByKey.get(currKey);

      if (!prevTarget || !currTarget || !prevPeer || !currPeer) continue;
      if (currPeer.peerCount === 0 || prevPeer.median === null || currPeer.median === null) continue;

      const targetTrend = computeTrend(prevTarget.value, currTarget.value);
      const peerMedianTrend = computeTrend(prevPeer.median, currPeer.median);

      const isOpposite =
        (targetTrend === "up" && peerMedianTrend === "down") ||
        (targetTrend === "down" && peerMedianTrend === "up");

      if (isOpposite) {
        flags.push({
          metricKey,
          calendarKey: currKey,
          periodEnd: currTarget.periodEnd,
          targetTrend,
          peerMedianTrend,
          description: `${metricKey}: target ${targetTrend} while peer median ${peerMedianTrend} (${prevKey} → ${currKey})`,
        });
      }
    }
  }

  return flags;
}
