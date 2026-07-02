import { CHART_HEIGHT, PADDING } from "../constants";
import type { ChartPoint } from "../types";

export function linePath(chartPoints: ChartPoint[]): string {
  return chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

export function areaPath(chartPoints: ChartPoint[]): string {
  if (chartPoints.length === 0) return "";
  const baseline = CHART_HEIGHT - PADDING.bottom;
  const start = chartPoints[0];
  const end = chartPoints[chartPoints.length - 1];
  return [
    `M ${start.x} ${baseline}`,
    ...chartPoints.map((point) => `L ${point.x} ${point.y}`),
    `L ${end.x} ${baseline}`,
    "Z",
  ].join(" ");
}
