import { CHART_HEIGHT, CHART_WIDTH, PADDING } from "../constants";
import type { ChartGeometry, LineSeries, SnapPoint, TimeRange } from "../types";
import { formatAxisDateForRange } from "../utils/format-dates";

export function buildChartGeometry(series: LineSeries[], range: TimeRange): ChartGeometry {
  const empty: ChartGeometry = {
    lines: [],
    yTicks: [],
    xLabels: [],
    yMin: 0,
    yMax: 1,
    snapPoints: [],
  };

  const allPoints = series.flatMap((line) => line.points);
  if (allPoints.length === 0) {
    return empty;
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const minTime = Math.min(...allPoints.map((p) => p.time));
  const maxTime = Math.max(...allPoints.map((p) => p.time));
  const timeRange = maxTime - minTime || 1;

  const minValue = Math.min(...allPoints.map((p) => p.value));
  const maxValue = Math.max(...allPoints.map((p) => p.value));
  const valueRange = maxValue - minValue || maxValue * 0.1 || 1;
  const yMin = Math.max(0, minValue - valueRange * 0.08);
  const yMax = maxValue + valueRange * 0.08;

  const lines = series.map((line) => ({
    ...line,
    chartPoints: line.points.map((point) => {
      const x =
        PADDING.left +
        (allPoints.length === 1
          ? plotWidth / 2
          : ((point.time - minTime) / timeRange) * plotWidth);
      const y =
        PADDING.top + plotHeight - ((point.value - yMin) / (yMax - yMin)) * plotHeight;
      return { ...point, x, y };
    }),
  }));

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return yMin + (yMax - yMin) * ratio;
  });

  if (lines.length === 0) {
    return { ...empty, lines, yTicks };
  }

  const snapByTime = new Map<number, SnapPoint>();
  for (const line of lines) {
    for (const point of line.chartPoints) {
      if (!snapByTime.has(point.time)) {
        snapByTime.set(point.time, { time: point.time, date: point.date, x: point.x });
      }
    }
  }
  const snapPoints = [...snapByTime.values()].sort((a, b) => a.time - b.time);

  const referenceLine = lines.reduce((longest, line) =>
    line.chartPoints.length > longest.chartPoints.length ? line : longest,
  );
  const referencePoints = referenceLine.chartPoints;

  const labelCount = Math.min(6, referencePoints.length);
  const labelIndexes =
    referencePoints.length <= labelCount
      ? referencePoints.map((_, index) => index)
      : Array.from({ length: labelCount }, (_, index) =>
          Math.round((index / (labelCount - 1)) * (referencePoints.length - 1)),
        );

  const xLabels = [...new Set(labelIndexes)].map((index) => ({
    x: referencePoints[index].x,
    label: formatAxisDateForRange(referencePoints[index].date, range),
  }));

  return { lines, yTicks, xLabels, yMin, yMax, snapPoints };
}
