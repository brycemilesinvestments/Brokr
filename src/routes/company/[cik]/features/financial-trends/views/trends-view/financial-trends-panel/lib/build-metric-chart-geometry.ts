import type { ChartPoint } from "@/lib/analysis";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import { formatAxisDate } from "../utils/format-metric";

export type PlottedPoint = ChartPoint & { plotX: number; plotY: number };

export function buildMetricChartGeometry(points: ChartPoint[]): {
  chartPoints: PlottedPoint[];
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
  yMin: number;
  yMax: number;
} {
  if (points.length === 0) {
    return { chartPoints: [], yTicks: [], xLabels: [], yMin: 0, yMax: 0 };
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const values = points.map((p) => p.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || Math.abs(maxValue) * 0.1 || 1;
  const yMin = minValue - valueRange * 0.08;
  const yMax = maxValue + valueRange * 0.08;

  const minTime = Date.parse(points[0].x);
  const maxTime = Date.parse(points[points.length - 1].x);
  const timeRange = maxTime - minTime || 1;

  const chartPoints: PlottedPoint[] = points.map((point) => {
    const time = Date.parse(point.x);
    const plotX =
      PADDING.left +
      (points.length === 1 ? plotWidth / 2 : ((time - minTime) / timeRange) * plotWidth);
    const plotY = PADDING.top + plotHeight - ((point.y - yMin) / (yMax - yMin)) * plotHeight;
    return { ...point, plotX, plotY };
  });

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return yMin + (yMax - yMin) * ratio;
  });

  const labelCount = Math.min(6, points.length);
  const labelIndexes =
    points.length <= labelCount
      ? points.map((_, index) => index)
      : Array.from({ length: labelCount }, (_, index) =>
          Math.round((index / (labelCount - 1)) * (points.length - 1)),
        );

  const xLabels = [...new Set(labelIndexes)].map((index) => ({
    x: chartPoints[index].plotX,
    label: formatAxisDate(points[index].x),
  }));

  return { chartPoints, yTicks, xLabels, yMin, yMax };
}

function linePath(points: PlottedPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.plotX} ${p.plotY}`).join(" ");
}

function areaPath(points: PlottedPoint[], baseline: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.plotX} ${baseline} L ${first.plotX} ${baseline} Z`;
}

export function chartPaths(
  chartPoints: PlottedPoint[],
  yMax: number,
  yMin: number,
): { line: string; area: string; baseline: number } {
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = PADDING.top + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
  return {
    line: linePath(chartPoints),
    area: areaPath(chartPoints, baseline),
    baseline,
  };
}
