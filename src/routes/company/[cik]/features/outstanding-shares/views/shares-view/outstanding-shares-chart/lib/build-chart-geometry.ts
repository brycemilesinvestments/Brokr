import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";
import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import type { ChartPoint } from "../types";
import { formatAxisDate } from "../utils/format-shares";

export function buildChartGeometry(points: OutstandingSharePoint[]): {
  chartPoints: ChartPoint[];
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
} {
  if (points.length === 0) {
    return { chartPoints: [], yTicks: [], xLabels: [] };
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const minShares = Math.min(...points.map((p) => p.shares));
  const maxShares = Math.max(...points.map((p) => p.shares));
  const shareRange = maxShares - minShares || maxShares * 0.1;
  const yMin = minShares - shareRange * 0.08;
  const yMax = maxShares + shareRange * 0.08;

  const minTime = Date.parse(points[0].asOfDate);
  const maxTime = Date.parse(points[points.length - 1].asOfDate);
  const timeRange = maxTime - minTime || 1;

  const chartPoints = points.map((point) => {
    const time = Date.parse(point.asOfDate);
    const x =
      PADDING.left +
      (points.length === 1 ? plotWidth / 2 : ((time - minTime) / timeRange) * plotWidth);
    const y =
      PADDING.top + plotHeight - ((point.shares - yMin) / (yMax - yMin)) * plotHeight;
    return { ...point, x, y };
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
    x: chartPoints[index].x,
    label: formatAxisDate(points[index].asOfDate),
  }));

  return { chartPoints, yTicks, xLabels };
}
