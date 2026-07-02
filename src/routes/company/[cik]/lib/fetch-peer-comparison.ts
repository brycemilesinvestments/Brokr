import { buildTimeSeriesBundle } from "@/lib/analysis";
import { createEdgarClient } from "@/lib/edgar";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import {
  assessPeerDataSufficiency,
  computeRelativeMetrics,
  emitPeerComparisonBundle,
  extractAllPeerMetrics,
  fetchCompaniesBySicFromSec,
  fetchLastFilingDateFromSec,
  fetchSicFromSec,
  filterChartToAnnual,
  flagDivergences,
  resolvePeers,
} from "@/lib/peers";
import {
  PEER_DISPLAY_METRICS,
  type PeerComparisonPayload,
} from "@/routes/company/[cik]/features/peers/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type { PeerComparisonPayload } from "@/routes/company/[cik]/features/peers/types";
export { PEER_DISPLAY_METRICS } from "@/routes/company/[cik]/features/peers/types";

export async function fetchPeerComparison(cik: string): Promise<PeerComparisonPayload> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const targetFacts = await edgar.getCompanyFacts(cik);
  const timeSeries = buildTimeSeriesBundle(targetFacts);
  const extended = buildExtendedMetricsBundle(timeSeries, targetFacts);
  const fullChart = { ...timeSeries.chart, ...extended.chart };

  const peerSet = await resolvePeers(
    { targetCik: cik, targetEntityName: targetFacts.entityName },
    {
      fetchSic: fetchSicFromSec,
      fetchCompaniesBySic: fetchCompaniesBySicFromSec,
      fetchLastFilingDate: fetchLastFilingDateFromSec,
    },
  );

  if (peerSet.status === "insufficient_peers") {
    return {
      status: "insufficient_peers",
      targetCik: peerSet.targetCik,
      targetEntityName: peerSet.targetEntityName,
      peerCount: peerSet.peers.length,
      sic: peerSet.sic,
    };
  }

  const peerExtractions = await extractAllPeerMetrics(peerSet.peers, {
    getCompanyFacts: (peerCik) => edgar.getCompanyFacts(peerCik),
  });

  const annualChart = filterChartToAnnual(fullChart);

  const filteredChart = Object.fromEntries(
    PEER_DISPLAY_METRICS.reduce<[string, NonNullable<(typeof annualChart)[string]>][]>(
      (entries, key) => {
        if (annualChart[key]?.length) entries.push([key, annualChart[key]]);
        return entries;
      },
      [],
    ),
  );

  const relativeMetrics = computeRelativeMetrics(filteredChart, peerExtractions);
  const sufficiency = assessPeerDataSufficiency(relativeMetrics, PEER_DISPLAY_METRICS);

  if (!sufficiency.sufficient) {
    return {
      status: "insufficient_peers",
      targetCik: peerSet.targetCik,
      targetEntityName: peerSet.targetEntityName,
      peerCount: peerSet.peers.length,
      sic: peerSet.sic,
      reason: "insufficient_peer_data",
      metricsWithData: sufficiency.metricsWithData,
      metricsRequired: sufficiency.metricsRequired,
    };
  }

  const divergences = flagDivergences(relativeMetrics);
  const bundle = emitPeerComparisonBundle({
    targetCik: peerSet.targetCik,
    targetEntityName: peerSet.targetEntityName,
    peerSet,
    targetChart: filteredChart,
    relativeMetrics,
    divergences,
  });

  return { status: "ok", bundle };
}
