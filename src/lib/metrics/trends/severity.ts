import type { DirectionalTrend, TrendSeverity } from "@/lib/metrics/trends/types";

/**
 * Computes severity from relative magnitude and run length.
 * Acceleration upgrades severity by one level.
 */
export function computeSeverity(
  magnitude: number,
  startValue: number,
  runLength: number,
): TrendSeverity {
  const relativeMag =
    startValue !== 0 ? Math.abs(magnitude) / Math.abs(startValue) : Math.abs(magnitude);

  const runBonus = runLength >= 6 ? 0.10 : runLength >= 4 ? 0.05 : 0;
  const score = relativeMag + runBonus;

  if (score >= 0.25) return "high";
  if (score >= 0.08) return "med";
  return "low";
}

/**
 * Final severity ranking pass: upgrades severity by one level for accelerating trends.
 */
export function rankSeverity(trends: DirectionalTrend[]): DirectionalTrend[] {
  return trends.map((trend) => {
    if (trend.acceleration?.direction !== "accelerating") return trend;

    const upgraded: TrendSeverity =
      trend.severity === "low" ? "med" : trend.severity === "med" ? "high" : "high";

    return { ...trend, severity: upgraded };
  });
}
