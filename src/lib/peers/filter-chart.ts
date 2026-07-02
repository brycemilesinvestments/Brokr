import type { ChartBundle, ChartPoint } from "@/lib/analysis";

/** Keep only annual-frequency points (peer comparison uses FY/calendar-year alignment). */
export function filterChartToAnnual(chart: ChartBundle): ChartBundle {
  const filtered: ChartBundle = {};

  for (const [key, points] of Object.entries(chart)) {
    const annual = points.filter((p) => p.frequency === "annual");
    if (annual.length > 0) {
      filtered[key] = annual;
    }
  }

  return filtered;
}

function latestPoint(points: ChartPoint[] | undefined): ChartPoint | undefined {
  return points?.at(-1);
}
