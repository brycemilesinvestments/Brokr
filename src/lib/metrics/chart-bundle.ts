import type { ChartBundle, ChartPoint } from "@/lib/analysis";
import type { DerivedMetricSeries, SegmentSeries } from "@/lib/metrics/types";

function derivedToChartPoints(series: DerivedMetricSeries): ChartPoint[] {
  if (series.status === "not_reported") return [];

  const points: ChartPoint[] = [];

  for (const point of series.annual) {
    if (point.value === undefined) continue;
    points.push({ x: point.periodEnd, y: point.value, frequency: "annual" });
  }
  for (const point of series.quarterly) {
    if (point.value === undefined) continue;
    points.push({ x: point.periodEnd, y: point.value, frequency: "quarterly" });
  }

  return points.sort((a, b) => a.x.localeCompare(b.x));
}

function segmentToChartPoints(segment: SegmentSeries): ChartPoint[] {
  if (segment.status === "not_reported") return [];

  const points: ChartPoint[] = [];
  for (const point of segment.annual) {
    points.push({ x: point.periodEnd, y: point.value, frequency: "annual" });
  }
  for (const point of segment.quarterly) {
    points.push({ x: point.periodEnd, y: point.value, frequency: "quarterly" });
  }
  return points.sort((a, b) => a.x.localeCompare(b.x));
}

export function toMetricsChartBundle(input: {
  derived: DerivedMetricSeries[];
  segments: SegmentSeries[];
  backlogKey: string;
  backlogPoints: ChartPoint[];
}): ChartBundle {
  const chart: ChartBundle = {};

  for (const series of input.derived) {
    chart[series.key] = derivedToChartPoints(series);
  }

  for (const segment of input.segments) {
    const key = `${segment.dimension}:${segment.segmentName}`;
    chart[key] = segmentToChartPoints(segment);
  }

  if (input.backlogPoints.length > 0) {
    chart[input.backlogKey] = input.backlogPoints;
  }

  return chart;
}

export { derivedToChartPoints };
