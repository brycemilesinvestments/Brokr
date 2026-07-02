import type { ChartPoint } from "@/lib/analysis";

export function filterChartPoints(
  allPoints: ChartPoint[] | undefined,
  frequency: "quarterly" | "annual" | "both",
): ChartPoint[] {
  if (!allPoints) return [];
  const filtered =
    frequency === "both" ? allPoints : allPoints.filter((point) => point.frequency === frequency);
  return filtered.toSorted((a, b) => a.x.localeCompare(b.x));
}
