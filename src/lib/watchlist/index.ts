/**
 * Watchlist chunk — per-company trigger evaluation and alert emission.
 * Depends on: no cross-chunk lib imports (self-contained types).
 */

export type {
  NewFilingTrigger,
  ThresholdMetric,
  ThresholdTrigger,
  InsiderPurchaseTrigger,
  Trigger,
  TriggerConfig,
  WatchlistStoreRow,
  WatchlistEntry,
  NewFilingAlert,
  ThresholdAlert,
  InsiderPurchaseAlert,
  StructuredAlert,
  AlertEmitter,
  FilingInput,
  InsiderTransactionInput,
  MetricPoint,
  WatchlistRouterInput,
  WatchlistRouterOutput,
} from "@/lib/watchlist/types";

export { loadWatchlist } from "@/lib/watchlist/load-watchlist";
export { detectNewFilings } from "@/lib/watchlist/detect-new-filings";
export { evalThresholds } from "@/lib/watchlist/eval-thresholds";
export { evalInsider } from "@/lib/watchlist/eval-insider";
export { dedup } from "@/lib/watchlist/dedup";
export { emitAlerts } from "@/lib/watchlist/emit-alerts";
export { runWatchlistRouter } from "@/lib/watchlist/router";
