// ── Trigger configs ────────────────────────────────────────────────────────────

export type NewFilingTrigger = {
  kind: "new_filing";
  /**
   * Filter by SEC form type (e.g. "10-K", "4").
   * Undefined or empty array = any form type.
   */
  formTypes?: string[];
};

export type ThresholdMetric =
  | "net_margin"
  | "operating_margin"
  | "debt_to_equity"
  | "fcf"
  | "health_score";

export type ThresholdTrigger = {
  kind: "threshold";
  metric: ThresholdMetric;
  /**
   * "lt" = fires when value < threshold.
   * "gt" = fires when value > threshold.
   * "drop" = fires when (prior − latest) >= threshold (point drop).
   */
  operator: "lt" | "gt" | "drop";
  /** Absolute threshold value. Margins use decimals (−0.05 = −5%). */
  value: number;
};

export type InsiderPurchaseTrigger = {
  kind: "insider_purchase";
  /** Minimum shares transacted. Undefined = any non-zero amount. */
  minShares?: number;
};

export type Trigger = NewFilingTrigger | ThresholdTrigger | InsiderPurchaseTrigger;

export type TriggerConfig = {
  triggers: Trigger[];
};

// ── Store row (snake_case, matches Supabase migration) ─────────────────────────

export type WatchlistStoreRow = {
  id: string;
  cik: string;
  trigger_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ── Watchlist entry (DB row, camelCase) ────────────────────────────────────────

export type WatchlistEntry = {
  id: string;
  cik: string;
  triggerConfig: TriggerConfig;
  createdAt: string;
  updatedAt: string;
};

// ── Structured alert types ─────────────────────────────────────────────────────

export type NewFilingAlert = {
  type: "new_filing";
  cik: string;
  accessionNumber: string;
  form: string;
  filingDate: string;
  /** Deterministic dedup key. */
  eventKey: string;
};

export type ThresholdAlert = {
  type: "threshold_crossed";
  cik: string;
  metric: ThresholdMetric;
  value: number;
  threshold: number;
  operator: "lt" | "gt" | "drop";
  /** Period end date of the triggering data point (ISO 8601). */
  periodEnd: string;
  /** Deterministic dedup key. */
  eventKey: string;
};

export type InsiderPurchaseAlert = {
  type: "insider_purchase";
  cik: string;
  reportingOwner: string;
  transactionDate: string;
  accessionNumber?: string;
  sharesTransacted?: number;
  /** Deterministic dedup key. */
  eventKey: string;
};

export type StructuredAlert = NewFilingAlert | ThresholdAlert | InsiderPurchaseAlert;

// ── Delivery-agnostic channel ──────────────────────────────────────────────────

/** Injected by caller; may be email, webhook, in-app, etc. */
export type AlertEmitter = (alert: StructuredAlert) => Promise<void> | void;

// ── Step inputs ────────────────────────────────────────────────────────────────

/** Minimal filing descriptor for new-filing detection. */
export type FilingInput = {
  accessionNumber: string;
  form: string;
  filingDate: string;
};

/** Minimal insider transaction descriptor for eval-insider. */
export type InsiderTransactionInput = {
  reportingOwner: string;
  transactionDate: string;
  transactionType?: string;
  acquiredOrDisposed?: "A" | "D";
  sharesTransacted?: number;
  accessionNumber?: string;
};

/** A time-ordered metric data point for threshold evaluation. */
export type MetricPoint = {
  periodEnd: string;
  value: number;
};

// ── Router I/O ─────────────────────────────────────────────────────────────────

export type WatchlistRouterInput = {
  /** Watchlist entries to evaluate. */
  entries: WatchlistEntry[];
  /** Current SEC filings per CIK (from submissions feed). */
  filingsByCik: Record<string, FilingInput[]>;
  /** Previously seen accession numbers per CIK (for idempotency). */
  seenAccessionsByCik: Record<string, ReadonlySet<string>>;
  /**
   * Named metric series per CIK.
   * Keys match ThresholdMetric values; callers map domain bundles here.
   */
  metricSeriesByCik?: Record<string, Record<string, MetricPoint[]>>;
  /** Recent insider transactions per CIK. */
  transactionsByCik?: Record<string, InsiderTransactionInput[]>;
  /** Previously fired event keys (dedup guard). */
  firedEventKeys: ReadonlySet<string>;
  /** Delivery channel — injected by caller. */
  emitter: AlertEmitter;
};

export type WatchlistRouterOutput = {
  /** Alerts that passed dedup and were delivered. */
  alerts: StructuredAlert[];
  /** New accession numbers discovered per CIK (caller persists these). */
  newSeenAccessions: Record<string, string[]>;
  /** Newly fired event keys (caller persists these). */
  newFiredEventKeys: string[];
};
