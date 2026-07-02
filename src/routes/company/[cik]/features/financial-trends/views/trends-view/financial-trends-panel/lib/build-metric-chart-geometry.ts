import type { ChartPoint } from "@/lib/analysis";

export type MetricChartRow = ChartPoint & {
  date: string;
  value: number;
};

export function buildMetricChartData(points: ChartPoint[]): MetricChartRow[] {
  return points.map((point) => ({
    ...point,
    date: point.x,
    value: point.y,
  }));
}

/** @deprecated Use MetricChartRow */
export type PlottedPoint = MetricChartRow;

/** @deprecated Use buildMetricChartData */
function buildMetricChartGeometry(points: ChartPoint[]) {
  const chartData = buildMetricChartData(points);
  return {
    chartPoints: chartData,
    yTicks: [],
    xLabels: [],
    yMin: 0,
    yMax: 0,
  };
}
