import type { RelativeMetricSeries } from "@/lib/peers/types";

export const MIN_PEERS_WITH_DATA = 2;
export const MIN_METRICS_WITH_PEER_DATA = 4;

export type PeerDataSufficiency = {
  sufficient: boolean;
  metricsWithData: number;
  metricsRequired: number;
};

/**
 * P6: Require n >= MIN_PEERS_WITH_DATA on the latest period for a majority of
 * display metrics before treating peer comparison as valid.
 */
export function assessPeerDataSufficiency(
  relativeMetrics: RelativeMetricSeries[],
  metricKeys: readonly string[],
  options?: { minMetrics?: number; minPeers?: number },
): PeerDataSufficiency {
  const minMetrics = options?.minMetrics ?? MIN_METRICS_WITH_PEER_DATA;
  const minPeers = options?.minPeers ?? MIN_PEERS_WITH_DATA;

  let metricsWithData = 0;

  for (const key of metricKeys) {
    const series = relativeMetrics.find((s) => s.metricKey === key);
    if (!series) continue;

    const comparableBand = [...series.peerBand]
      .reverse()
      .find((band) => band.peerCount >= minPeers);

    if (comparableBand) {
      metricsWithData++;
    }
  }

  return {
    sufficient: metricsWithData >= minMetrics,
    metricsWithData,
    metricsRequired: minMetrics,
  };
}
