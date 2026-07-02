import type { InsiderTransaction } from "@/lib/edgar";

/** Form 4 transaction codes (C9.1). */
export type InsiderTransactionCode =
  | "P"
  | "S"
  | "F"
  | "A"
  | "G"
  | "J"
  | "C";

export type InsiderSignalClass = "signal" | "noise";

/** C9.3 — Post-filing event windows in trading days. */
export type EventWindow = {
  label: "short" | "medium" | "long";
  startOffsetDays: 1;
  endOffsetDays: 5 | 20 | 60;
};

export const DEFAULT_EVENT_WINDOWS: EventWindow[] = [
  { label: "short", startOffsetDays: 1, endOffsetDays: 5 },
  { label: "medium", startOffsetDays: 1, endOffsetDays: 20 },
  { label: "long", startOffsetDays: 1, endOffsetDays: 60 },
];

/** C9.7 — Minimum open-market signal events before reporting CAR statistics. */
export const MINIMUM_SIGNAL_EVENTS = 5;

/** C9.6 — Rolling calendar window for insider cluster detection. */
export const CLUSTER_WINDOW_DAYS = 30;

/** C9.6 — Minimum distinct insiders in a cluster. */
export const CLUSTER_MIN_INSIDERS = 3;

/** C9.2 — t=0 is filing date, never transaction date. */
export type InsiderEvent = {
  transaction: InsiderTransaction;
  filingDate: string;
  eventDate: string;
  classification: InsiderSignalClass;
  transactionCode: InsiderTransactionCode;
  clusterId?: string;
};

/** C9.6 — Multiple insiders within a rolling window. */
export type InsiderEventCluster = {
  clusterId: string;
  startDate: string;
  endDate: string;
  windowDays: number;
  events: InsiderEvent[];
};

/** C9.4 — Benchmark-subtracted return over an event window. */
export type AbnormalReturn = {
  eventDate: string;
  filingDate: string;
  window: EventWindow;
  stockReturn: number;
  benchmarkReturn: number;
  abnormalReturn: number;
  cumulativeAbnormalReturn: number;
};

/** C9.5 — Aggregated statistics per signal type and window. */
export type EventStudyAggregation = {
  signalType: InsiderTransactionCode;
  window: EventWindow;
  eventCount: number;
  meanCar: number;
  hitRate: number;
};

export type SignalDecay = {
  signalType: InsiderTransactionCode;
  shortCar: number;
  mediumCar: number;
  longCar: number;
};

/** C9.7 — Honest null when signal count is below threshold. */
export type InsufficientSignalResult = {
  status: "insufficient_signal";
  cik: string;
  signalEventCount: number;
  minimumRequired: number;
  message: string;
};

export type EventStudyCompleteResult = {
  status: "complete";
  cik: string;
  symbol: string;
  eventCount: number;
  signalEvents: InsiderEvent[];
  noiseEvents: InsiderEvent[];
  abnormalReturns: AbnormalReturn[];
  aggregations: EventStudyAggregation[];
  signalDecay: SignalDecay[];
  clusters: InsiderEventCluster[];
};

export type EventStudyResult = EventStudyCompleteResult | InsufficientSignalResult;

export type EventStudyState = {
  cik: string;
  symbol: string;
  result: EventStudyResult | null;
};
