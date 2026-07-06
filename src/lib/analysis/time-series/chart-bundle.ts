import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import type { ChartBundle, ChartPoint, SeriesAnomaly } from "@/lib/analysis/time-series/types";

function anomalySet(anomalies: SeriesAnomaly[]): Set<string> {
  const set = new Set<string>();
  for (const a of anomalies) {
    set.add(`${a.frequency}:${a.periodEnd}:${a.metric}`);
  }
  return set;
}

function metricChartKey(concept: string): string {
  return concept;
}

export function toChartBundle(
  metrics: MetricSeriesBundle,
  anomalies: SeriesAnomaly[],
): ChartBundle {
  const chart: ChartBundle = {};
  const anomalyFlags = anomalySet(anomalies);

  for (const [concept, series] of Object.entries(metrics.series)) {
    if (series.status === "not_reported") continue;

    const key = metricChartKey(concept);
    const points: ChartPoint[] = [];

    for (const frequency of ["annual", "quarterly"] as const) {
      const source = frequency === "annual" ? series.annual : series.quarterly;
      for (const point of source) {
        const chartPoint: ChartPoint = {
          x: point.periodEnd,
          y: point.value,
          frequency,
          accessionNumber: point.accn,
          delta_qoq: frequency === "quarterly" ? point.deltaQoq : undefined,
          delta_yoy: point.deltaYoy,
        };

        const revenueAnomaly = anomalyFlags.has(`${frequency}:${point.periodEnd}:revenue`);
        const conceptAnomaly = anomalyFlags.has(`${frequency}:${point.periodEnd}:${concept}`);
        if (revenueAnomaly || conceptAnomaly) {
          chartPoint.anomaly = true;
        }

        points.push(chartPoint);
      }
    }

    chart[key] = points.sort((a, b) => a.x.localeCompare(b.x));
  }

  return chart;
}

export function toRatioChartBundle(
  ratioSeries: Record<string, Array<{ periodEnd: string; frequency: "annual" | "quarterly"; value?: number }>>,
  anomalies: SeriesAnomaly[],
): ChartBundle {
  const chart: ChartBundle = {};
  const anomalyFlags = anomalySet(anomalies);

  for (const [metric, points] of Object.entries(ratioSeries)) {
    chart[metric] = points
      .filter((p) => p.value !== undefined)
      .map((p) => ({
        x: p.periodEnd,
        y: p.value!,
        frequency: p.frequency,
        anomaly: anomalyFlags.has(`${p.frequency}:${p.periodEnd}:${metric}`) || undefined,
      }))
      .sort((a, b) => a.x.localeCompare(b.x));
  }

  return chart;
}
