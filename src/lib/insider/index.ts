/**
 * Insider chunk — Form 4 event-study module (Tier 3).
 * Depends on: Edgar (Chunk 1), Market (Chunk 2).
 */
export type {
  InsiderTransactionCode,
  InsiderSignalClass,
  EventWindow,
  InsiderEvent,
  InsiderEventCluster,
  AbnormalReturn,
  EventStudyAggregation,
  SignalDecay,
  InsufficientSignalResult,
  EventStudyCompleteResult,
  EventStudyResult,
  EventStudyState,
} from "@/lib/insider/types";

export {
  DEFAULT_EVENT_WINDOWS,
  MINIMUM_SIGNAL_EVENTS,
  CLUSTER_WINDOW_DAYS,
  CLUSTER_MIN_INSIDERS,
} from "@/lib/insider/types";

export {
  parseTransactionCode,
  classifyTransaction,
  buildInsiderEvent,
  validateFilingDateAlignment,
  type FilingDateAlignmentResult,
} from "@/lib/insider/classify";

export {
  resolveBenchmarkSymbol,
  computeBenchmarkReturn,
  benchmarkExpectedReturnDates,
} from "@/lib/insider/benchmark";

export {
  toPriceBars,
  sortedUniqueDates,
  computeWindowReturn,
  computeAbnormalReturn,
  assertNoLookAheadAtT0,
  expectedReturnPriceDates,
  type PriceBar,
} from "@/lib/insider/abnormal";

export {
  detectClusters,
  computeAggregations,
  computeSignalDecay,
  runEventStudy,
  type EventStudyInput,
  type EventStudyTransaction,
} from "@/lib/insider/aggregate";

export {
  buildFilingDateLookup,
  resolveInsiderFilingDate,
  toEventStudyTransactions,
} from "@/lib/insider/event-study-transactions";
