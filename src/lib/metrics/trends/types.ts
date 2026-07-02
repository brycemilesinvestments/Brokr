import type { SeriesFrequency } from "@/lib/edgar/time-series";
import type { TimeSeriesBundle } from "@/lib/analysis";
import type { ExtendedMetricsBundle } from "@/lib/metrics/types";

export type TrendDirection = "up" | "down";

export type TrendSeverity = "low" | "med" | "high";

/** Second-derivative signal attached to a directional trend. */
export type AccelerationSignal = {
  direction: "accelerating" | "decelerating";
  startPeriod: string;
  endPeriod: string;
};

/** A sustained N-period run in a single metric series. */
export type DirectionalTrend = {
  metric: string;
  frequency: SeriesFrequency;
  direction: TrendDirection;
  /** Number of data points in the run (N points = N-1 directional changes). */
  run_length: number;
  start_period: string;
  end_period: string;
  /** Signed total change: end_value - start_value. */
  magnitude: number;
  severity: TrendSeverity;
  acceleration?: AccelerationSignal;
};

/** Named cross-metric divergence patterns. */
export type DivergencePatternName =
  | "receivables_outpacing_revenue"
  | "revenue_growth_margin_compression"
  | "earnings_quality_gap"
  | "creeping_dilution";

/** A cross-metric divergence pattern detected over a time window. */
export type DivergencePattern = {
  name: DivergencePatternName;
  description: string;
  frequency: SeriesFrequency;
  start_period: string;
  end_period: string;
  severity: TrendSeverity;
};

export type TrendConfig = {
  /** Minimum number of data points for a directional run to qualify. Default 3. */
  minRunLength: number;
};

export const DEFAULT_TREND_CONFIG: TrendConfig = {
  minRunLength: 3,
};

export type TrendDetectionInput = {
  timeSeries: TimeSeriesBundle;
  metricsBundle: ExtendedMetricsBundle;
};

export type TrendDetectionResult = {
  directional: DirectionalTrend[];
  divergence: DivergencePattern[];
};
