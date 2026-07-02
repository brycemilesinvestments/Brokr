export type {
  RatioSeriesKey,
  SeriesAnomaly,
  ChartPoint,
  ChartBundle,
  RatioSeriesPoint,
  TimeSeriesBundle,
  NotReportedMetric,
  TimeSeriesState,
  ContractCheck,
  ContractValidation,
} from "@/lib/analysis/time-series/types";

export {
  enrichQuarterlyDeltas,
  enrichAnnualDeltas,
  enrichMetricSeriesDeltas,
} from "@/lib/analysis/time-series/deltas";

export {
  computeRatioSeries,
  ratioSeriesForFrequency,
} from "@/lib/analysis/time-series/ratios";

export { detectSeriesAnomalies } from "@/lib/analysis/time-series/anomalies";
export { toChartBundle, toRatioChartBundle } from "@/lib/analysis/time-series/chart-bundle";

export {
  buildTimeSeriesBundle,
  buildTimeSeriesState,
  validateTimeSeriesContract,
  isTimeSeriesComplete,
} from "@/lib/analysis/time-series/build-bundle";
