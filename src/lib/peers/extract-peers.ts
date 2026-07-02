import { buildTimeSeriesBundle } from "@/lib/analysis";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import type { PeerEntry, PeerExtractDeps, PeerExtraction } from "@/lib/peers/types";

/**
 * P2: Run the full metric pipeline for one peer company.
 *
 * Pipeline (reuses existing chunks unchanged):
 *   getCompanyFacts → buildTimeSeriesBundle → buildExtendedMetricsBundle
 *
 * Returns a combined ChartBundle merging:
 *   - time-series chart (ratio series: gross_margin, etc.)
 *   - extended metrics chart (derived: fcf, working_capital, dilution, etc.)
 */
export async function extractPeerMetrics(
  peer: PeerEntry,
  deps: PeerExtractDeps,
): Promise<PeerExtraction> {
  const rawFacts = await deps.getCompanyFacts(peer.cik);
  const timeSeries = buildTimeSeriesBundle(rawFacts);
  const extended = buildExtendedMetricsBundle(timeSeries, rawFacts);

  const chart = { ...timeSeries.chart, ...extended.chart };

  return {
    peerEntry: peer,
    entityName: rawFacts.entityName,
    chart,
  };
}

/**
 * P2: Run the full metric pipeline for all peers in parallel.
 * Each peer is cached independently via the EdgarClient disk/bucket cache
 * (the getCompanyFacts call passes through the existing caching layer).
 */
export async function extractAllPeerMetrics(
  peers: PeerEntry[],
  deps: PeerExtractDeps,
): Promise<PeerExtraction[]> {
  const results = await Promise.allSettled(peers.map((peer) => extractPeerMetrics(peer, deps)));

  return results
    .filter((r): r is PromiseFulfilledResult<PeerExtraction> => r.status === "fulfilled")
    .map((r) => r.value);
}
