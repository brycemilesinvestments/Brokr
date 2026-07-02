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
} from "@/lib/metrics/trends/types";

export { DEFAULT_TREND_CONFIG } from "@/lib/metrics/trends/pipeline";
export { detectTrends } from "@/lib/metrics/trends/pipeline";
export { detectDirectional } from "@/lib/metrics/trends/directional";
export { detectDivergence } from "@/lib/metrics/trends/divergence";
export { detectAcceleration } from "@/lib/metrics/trends/acceleration";
export { rankSeverity, computeSeverity } from "@/lib/metrics/trends/severity";
