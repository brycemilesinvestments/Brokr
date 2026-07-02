export { fromEdgarFinancials } from "@/lib/analysis/types";
export type {
  Financials,
  Ratios,
  Delta,
  Anomaly,
  AnomalySeverity,
  AnalysisResult,
} from "@/lib/analysis/types";

export { computeRatios, safeDivide } from "@/lib/analysis/ratios";
export { computeDeltas, revenueYoYRatio } from "@/lib/analysis/deltas";
export {
  detectAnomalies,
  analyzeFinancials,
} from "@/lib/analysis/anomalies";
export {
  DEFAULT_THRESHOLDS,
  exceedsThreshold,
  isBelowFloor,
} from "@/lib/analysis/thresholds";
export type { ThresholdConfig } from "@/lib/analysis/thresholds";

export {
  type RatioSeriesKey,
  type SeriesAnomaly,
  type ChartPoint,
  type ChartBundle,
  type RatioSeriesPoint,
  type TimeSeriesBundle,
  type NotReportedMetric,
  type TimeSeriesState,
  type ContractCheck,
  type ContractValidation,
  buildTimeSeriesBundle,
  buildTimeSeriesState,
  validateTimeSeriesContract,
  isTimeSeriesComplete,
  computeRatioSeries,
  toChartBundle,
} from "@/lib/analysis/time-series";
