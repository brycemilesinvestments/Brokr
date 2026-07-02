import type {
  ChartBundle,
  ChartPoint,
  DivergenceFlag,
  PeerComparisonBundle,
  PeerSet,
  RelativeMetricSeries,
} from "@/lib/peers/types";

/**
 * P7: Emit a ChartBundle with:
 *   {metricKey}              — target line (original ChartPoints)
 *   peer_band:{metricKey}    — peer median per calendar period
 *   peer_min:{metricKey}     — peer minimum per calendar period
 *   peer_max:{metricKey}     — peer maximum per calendar period
 *
 * The band series use the target's periodEnd as x-axis so they overlay
 * the target line cleanly (same x scale).
 */
export function buildPeerComparisonChart(
  relativeMetrics: RelativeMetricSeries[],
  targetChart: ChartBundle,
): ChartBundle {
  const chart: ChartBundle = {};

  for (const series of relativeMetrics) {
    const { metricKey, target, peerBand } = series;

    // Target line — pass through existing chart points unchanged.
    const targetPoints = targetChart[metricKey];
    if (targetPoints && targetPoints.length > 0) {
      chart[metricKey] = targetPoints;
    }

    // Build a lookup from calendarKey → peerBand entry.
    const bandByKey = new Map(peerBand.map((b) => [b.calendarKey, b]));

    const medianPoints: ChartPoint[] = [];
    const minPoints: ChartPoint[] = [];
    const maxPoints: ChartPoint[] = [];

    for (const tp of target) {
      const band = bandByKey.get(tp.calendarKey);
      if (!band || band.peerCount === 0) continue;

      const base: Omit<ChartPoint, "y"> = {
        x: tp.periodEnd,
        frequency: tp.frequency,
      };

      medianPoints.push({ ...base, y: band.median! });
      minPoints.push({ ...base, y: band.min! });
      maxPoints.push({ ...base, y: band.max! });
    }

    if (medianPoints.length > 0) {
      chart[`peer_band:${metricKey}`] = medianPoints;
      chart[`peer_min:${metricKey}`] = minPoints;
      chart[`peer_max:${metricKey}`] = maxPoints;
    }
  }

  return chart;
}

/**
 * P7: Assemble the full PeerComparisonBundle from all pipeline outputs.
 */
export function emitPeerComparisonBundle(params: {
  targetCik: string;
  targetEntityName: string;
  peerSet: PeerSet;
  targetChart: ChartBundle;
  relativeMetrics: RelativeMetricSeries[];
  divergences: DivergenceFlag[];
}): PeerComparisonBundle {
  const chart = buildPeerComparisonChart(params.relativeMetrics, params.targetChart);

  return {
    targetCik: params.targetCik,
    targetEntityName: params.targetEntityName,
    peerSet: params.peerSet,
    relativeMetrics: params.relativeMetrics,
    divergences: params.divergences,
    chart,
  };
}
