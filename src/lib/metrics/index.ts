/**
 * Metrics chunk — extended fundamental metrics (Tier 1).
 * Depends on: Edgar (Chunk 1), Analysis time-series (Chunk 3).
 */
export type {
  DerivedMetricKey,
  ExtendedConceptKey,
  DerivedMetricPoint,
  DerivedMetricSeries,
  MissingMetricReason,
  CashFlowQuality,
  WorkingCapital,
  DilutionMetrics,
  SegmentDimension,
  SegmentSeriesPoint,
  SegmentSeries,
  SegmentBreakout,
  BacklogSeries,
  ExtendedMetricsBundle,
  ExtendedMetricsState,
} from "@/lib/metrics/types";

export { EXTENDED_CONCEPTS, REVENUE_CONCEPT, OPERATING_CF_CONCEPT } from "@/lib/metrics/constants";

export {
  valueAtPeriod,
  pointAtPeriod,
  daysInPeriod,
  buildDerivedSeries,
  buildConceptSeriesFromFacts,
  subtractSeriesValues,
  ratioOf,
  getMetricSeries,
} from "@/lib/metrics/series-helpers";

export { computeCashFlowQuality } from "@/lib/metrics/cashflow";
export { computeWorkingCapital } from "@/lib/metrics/working-capital";
export { computeDilutionMetrics } from "@/lib/metrics/dilution";
export { computeSegmentBreakout } from "@/lib/metrics/segments";
export { computeBacklogSeries } from "@/lib/metrics/backlog";
export { toMetricsChartBundle, derivedToChartPoints } from "@/lib/metrics/chart-bundle";
export {
  buildExtendedMetricsBundle,
  buildExtendedMetricsState,
} from "@/lib/metrics/build-bundle";

export type {
  TrendDirection,
  TrendSeverity,
  AccelerationSignal,
  DirectionalTrend,
  DivergencePatternName,
  DivergencePattern,
  TrendConfig,
  TrendDetectionInput,
  TrendDetectionResult,
} from "@/lib/metrics/trends";

export {
  DEFAULT_TREND_CONFIG,
  detectTrends,
  detectDirectional,
  detectDivergence,
  detectAcceleration,
  rankSeverity,
  computeSeverity,
} from "@/lib/metrics/trends";

// ── Health Score (H1–H6) ──────────────────────────────────────────────────────

export type {
  HealthSubScoreKey,
  DrivingMetric,
  SubScore,
  CompositeWeights,
  HealthScorePoint,
  FramingLabel,
  PeerPercentilePoint,
  PeerHealthInput,
  HealthSeries,
  HealthScoreBundle,
  HealthScoreInput,
} from "@/lib/metrics/health";

export { DEFAULT_WEIGHTS, HEALTH_FRAMING, buildHealthScoreBundle } from "@/lib/metrics/health";
export type { Breakpoint } from "@/lib/metrics/health";
export { piecewiseScore, weightedAverage, clampScore } from "@/lib/metrics/health";
