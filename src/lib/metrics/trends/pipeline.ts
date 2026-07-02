import { detectAcceleration } from "@/lib/metrics/trends/acceleration";
import { detectDirectional } from "@/lib/metrics/trends/directional";
import { detectDivergence } from "@/lib/metrics/trends/divergence";
import { rankSeverity } from "@/lib/metrics/trends/severity";
import {
  DEFAULT_TREND_CONFIG,
  type TrendConfig,
  type TrendDetectionInput,
  type TrendDetectionResult,
} from "@/lib/metrics/trends/types";

export { DEFAULT_TREND_CONFIG };

/**
 * Router pipeline:
 *   detect_directional → detect_acceleration → rank_severity
 *   detect_divergence  (parallel, deterministic)
 */
export function detectTrends(
  input: TrendDetectionInput,
  config: TrendConfig = DEFAULT_TREND_CONFIG,
): TrendDetectionResult {
  const directionalRaw = detectDirectional(input, config);
  const withAcceleration = detectAcceleration(directionalRaw, input);
  const directional = rankSeverity(withAcceleration);

  const divergence = detectDivergence(input, config);

  return { directional, divergence };
}
