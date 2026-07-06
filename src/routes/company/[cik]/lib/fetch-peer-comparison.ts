import { buildTimeSeriesBundle } from "@/lib/analysis";
import { formatCik } from "@/lib/edgar/constants";
import { createEdgarClient } from "@/lib/edgar";
import { getCompanyTickers } from "@/lib/edgar/tickers";
import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import {
  assessPeerDataSufficiency,
  computeRelativeMetrics,
  emitPeerComparisonBundle,
  extractAllPeerMetrics,
  fetchCompaniesBySicFromSec,
  fetchComparePeersFromYahoo,
  fetchLastFilingDateFromSec,
  fetchSicFromSec,
  filterChartToAnnual,
  flagDivergences,
  MIN_PEER_COUNT,
  resolvePeers,
  resolveTickerToCompanyFromSec,
} from "@/lib/peers";
import type { PeerSet } from "@/lib/peers";
import {
  PEER_DISPLAY_METRICS,
  type PeerComparisonPayload,
} from "@/routes/company/[cik]/features/peers/types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStoredPeersForCik,
  MIN_STORED_PEER_COUNT,
  replaceStoredPeersForCik,
  storedPeersToPeerEntries,
} from "@/lib/supabase/company-peers";

export type { PeerComparisonPayload } from "@/routes/company/[cik]/features/peers/types";

export type FetchPeerComparisonOptions = {
  /** When true, bypass stored peers and re-resolve from Yahoo/SIC. */
  refresh?: boolean;
};

async function resolveLivePeerSet(input: {
  cik: string;
  targetEntityName: string;
  ticker?: string;
}): Promise<PeerSet> {
  return resolvePeers(
    {
      targetCik: input.cik,
      targetEntityName: input.targetEntityName,
      ticker: input.ticker,
    },
    {
      fetchSic: fetchSicFromSec,
      fetchCompaniesBySic: fetchCompaniesBySicFromSec,
      fetchLastFilingDate: fetchLastFilingDateFromSec,
      fetchComparePeersByTicker: fetchComparePeersFromYahoo,
      resolveTickerToCompany: resolveTickerToCompanyFromSec,
    },
  );
}

async function loadPeerSet(input: {
  cik: string;
  targetEntityName: string;
  ticker?: string;
  refresh?: boolean;
}): Promise<PeerSet> {
  if (!input.refresh) {
    const storedPeers = await getStoredPeersForCik(input.cik);
    if (storedPeers.length >= MIN_STORED_PEER_COUNT) {
      const sic = await fetchSicFromSec(input.cik).catch(() => null);
      return {
        targetCik: formatCik(input.cik),
        targetEntityName: input.targetEntityName,
        sic: sic ?? undefined,
        peers: storedPeersToPeerEntries(storedPeers),
        status: "ok",
      };
    }
  }

  const peerSet = await resolveLivePeerSet(input);

  if (peerSet.peers.length >= MIN_PEER_COUNT) {
    await replaceStoredPeersForCik({
      sourceCik: input.cik,
      sourceEntityName: input.targetEntityName,
      sourceTicker: input.ticker ?? null,
      peers: peerSet.peers,
      refreshSource: "yahoo+sic",
    });
  }

  return peerSet;
}

async function enrichPeerTickers(peerSet: PeerSet): Promise<PeerSet> {
  const tickers = await getCompanyTickers();
  const tickerByCik = new Map(
    tickers.map((entry) => [formatCik(entry.cik), entry.ticker] as const),
  );

  return {
    ...peerSet,
    peers: peerSet.peers.map((peer) => ({
      ...peer,
      ticker: peer.ticker ?? tickerByCik.get(formatCik(peer.cik)),
    })),
  };
}

export async function fetchPeerComparison(
  cik: string,
  options: FetchPeerComparisonOptions = {},
): Promise<PeerComparisonPayload> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const [targetFacts, companyMeta] = await Promise.all([
    edgar.getCompanyFacts(cik),
    resolveCompanyByCik(cik),
  ]);
  const timeSeries = buildTimeSeriesBundle(targetFacts);
  const extended = buildExtendedMetricsBundle(timeSeries, targetFacts);
  const fullChart = { ...timeSeries.chart, ...extended.chart };

  const peerSet = await enrichPeerTickers(
    await loadPeerSet({
      cik,
      targetEntityName: targetFacts.entityName,
      ticker: companyMeta?.ticker || undefined,
      refresh: options.refresh,
    }),
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
