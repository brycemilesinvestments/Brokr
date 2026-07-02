/**
 * Peers chunk — P1–P7 peer comparison pipeline.
 * Depends on: Edgar (Chunk 1), Analysis (Chunk 3), Metrics (Chunk 7).
 *
 * Router: resolve_peers → extract_peers → align_periods →
 *         compute_relative → flag_divergence → emit_bundle
 */

// Types (including re-exported analysis types used by consumers)
export type { ChartBundle, ChartPoint } from "@/lib/peers/types";
export type {
  PeerSelectionMethod,
  PeerEntry,
  PeerSet,
  CalendarKey,
  PeerPeriodPoint,
  PeerBandPoint,
  TargetPeriodPoint,
  PercentilePoint,
  RelativeMetricSeries,
  Trend,
  DivergenceFlag,
  PeerExtraction,
  PeerComparisonBundle,
  PeerResolveDeps,
  PeerExtractDeps,
} from "@/lib/peers/types";

// P1: Peer resolution
export { resolvePeers } from "@/lib/peers/resolve-peers";
export type { ResolvePeersInput } from "@/lib/peers/resolve-peers";
export { getCuratedPeers } from "@/lib/peers/curated-peers";
export { isFilingWithinMonths, RECENT_FILING_MONTHS } from "@/lib/peers/recent-filing";
export { filterChartToAnnual } from "@/lib/peers/filter-chart";
export { assessPeerDataSufficiency } from "@/lib/peers/assess-data-sufficiency";
export type { PeerDataSufficiency } from "@/lib/peers/assess-data-sufficiency";

// P1: Production fetch adapters (inject into resolvePeers via PeerResolveDeps)
export {
  fetchSicFromSec,
  fetchCompaniesBySicFromSec,
  fetchLastFilingDateFromSec,
} from "@/lib/peers/adapters";

// P2: Peer metric extraction
export { extractAllPeerMetrics } from "@/lib/peers/extract-peers";

// P3: Period alignment
export {
  toCalendarKey,
  frequencyFromKey,
  alignTargetSeries,
  collectPeerPointsByKey,
} from "@/lib/peers/align-periods";
export type { PeerPointsByKey } from "@/lib/peers/align-periods";

// P4: Relative metrics (percentile, target vs peer-median)
export {
  computeMedian,
  computePercentileRank,
  computeRelativeForMetric,
  computeRelativeMetrics,
} from "@/lib/peers/compute-relative";

// P5: Divergence detection
export { computeTrend, flagDivergences } from "@/lib/peers/flag-divergence";

// P7: Chart bundle emission
export { buildPeerComparisonChart, emitPeerComparisonBundle } from "@/lib/peers/emit-bundle";
