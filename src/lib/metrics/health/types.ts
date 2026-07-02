import type { SeriesFrequency } from "@/lib/edgar/time-series";
import type { TimeSeriesBundle } from "@/lib/analysis";
import type { ExtendedMetricsBundle } from "@/lib/metrics/types";

// ── Sub-score keys ────────────────────────────────────────────────────────────

export type HealthSubScoreKey =
  | "profitability"
  | "growth_quality"
  | "balance_sheet"
  | "cash_generation"
  | "dilution";

// ── Driving metric (H2 transparency + H6 drill-down) ─────────────────────────

/**
 * A single input metric that contributed to a sub-score.
 * Exposes the raw value for transparency and a drill-down path for UI linking.
 */
export type DrivingMetric = {
  /** Internal metric key (e.g. "net_margin", "current_ratio"). */
  metricKey: string;
  /** Human-readable label for display. */
  label: string;
  /** Raw value used during scoring; undefined when data was unavailable. */
  value: number | undefined;
  /**
   * H6 — relative path for drill-down to the underlying metric chart.
   * Callers substitute {cik} with the company's CIK.
   * Example: "/company/{cik}/metrics#net_margin"
   */
  drillDownPath: string;
};

// ── Sub-score ─────────────────────────────────────────────────────────────────

/** One of the five H1 component scores, 0–100. */
export type SubScore = {
  key: HealthSubScoreKey;
  /** 0–100; deterministic given the same inputs. */
  score: number;
  /** All driving metrics for this sub-score (H2 transparency). */
  inputs: DrivingMetric[];
};

// ── Composite weights (H2 transparency) ──────────────────────────────────────

export type CompositeWeights = {
  readonly profitability: number;
  readonly growth_quality: number;
  readonly balance_sheet: number;
  readonly cash_generation: number;
  readonly dilution: number;
};

// ── Time-series point (H4) ────────────────────────────────────────────────────

export type HealthScorePoint = {
  periodEnd: string;
  frequency: SeriesFrequency;
  /** Weighted composite of all sub-scores, 0–100. */
  composite: number;
  subscores: SubScore[];
};

// ── Framing label (H5) ────────────────────────────────────────────────────────

/**
 * Mandatory framing label: every HealthSeries carries this.
 * Tests assert type === "diagnostic" and disclaimer is non-empty.
 */
export type FramingLabel = {
  /** Always "diagnostic" — tests assert this field is present and correct. */
  type: "diagnostic";
  text: string;
  disclaimer: string;
};

// ── Peer-relative injection (H3) ─────────────────────────────────────────────

/**
 * Pre-computed peer percentile rank for one sub-score at one period.
 * Callers supply this from the peers chunk; health never imports peers directly.
 */
export type PeerPercentilePoint = {
  periodEnd: string;
  calendarKey: string;
  /** 0–100, where 50 = target equals peer median. */
  percentileRank: number;
};

/** Peer percentile ranks keyed by sub-score. Partial: only provided scores are included. */
export type PeerHealthInput = Partial<Record<HealthSubScoreKey, PeerPercentilePoint[]>>;

// ── Full bundle ───────────────────────────────────────────────────────────────

export type HealthSeries = {
  cik: string;
  entityName: string;
  /** Explicit weights used for composite (H2). */
  weights: CompositeWeights;
  /** Chronologically sorted health score over available periods (H4). */
  points: HealthScorePoint[];
  /** H5 — mandatory framing label; tests assert presence. */
  framing: FramingLabel;
};

export type HealthScoreBundle = {
  series: HealthSeries;
  /** H3 — populated when caller supplied peer percentile data. */
  peerRelative?: PeerHealthInput;
};

// ── Pipeline input ────────────────────────────────────────────────────────────

export type HealthScoreInput = {
  cik: string;
  entityName: string;
  /** Chunk 3 output — ratio series and metric series. */
  timeSeries: TimeSeriesBundle;
  /** Chunk 7 output — derived metrics (FCF, dilution, working capital). */
  metricsBundle: ExtendedMetricsBundle;
  /** H2 — caller may override default weights; partial overrides are merged. */
  weights?: Partial<CompositeWeights>;
  /** H3 — optional pre-computed peer percentile data. */
  peer?: PeerHealthInput;
};
