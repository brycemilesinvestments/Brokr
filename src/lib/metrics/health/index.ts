/**
 * Health score sub-module — barrel export.
 * Part of the Metrics chunk (src/lib/metrics/**).
 * Consumers import from @/lib/metrics/health (or via @/lib/metrics barrel).
 */

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
} from "@/lib/metrics/health/types";

export type { Breakpoint } from "@/lib/metrics/health/score-utils";
export { piecewiseScore, weightedAverage, clampScore } from "@/lib/metrics/health/score-utils";

export {
  computeProfitabilityScore,
  computeGrowthQualityScore,
  computeBalanceSheetScore,
  computeCashGenerationScore,
  computeDilutionScore,
} from "@/lib/metrics/health/subscores";

export {
  computeHealthScore,
  computeHealthScore as buildHealthScoreBundle,
} from "@/lib/metrics/health/pipeline";

export { DEFAULT_WEIGHTS, HEALTH_FRAMING } from "@/lib/metrics/health/constants";
export { buildRevenueGrowthMap } from "@/lib/metrics/health/growth-quality";
