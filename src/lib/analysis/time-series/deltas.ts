import { safeDivide } from "@/lib/analysis/ratios";
import type { MetricSeriesPoint } from "@/lib/edgar/time-series";

function pctChange(current: number, prior: number | undefined): number | undefined {
  if (prior === undefined || prior === 0) return undefined;
  return (current - prior) / prior;
}

function priorQuarterPoint(
  points: MetricSeriesPoint[],
  index: number,
): MetricSeriesPoint | undefined {
  return index > 0 ? points[index - 1] : undefined;
}

function sameQuarterPriorYear(
  points: MetricSeriesPoint[],
  current: MetricSeriesPoint,
): MetricSeriesPoint | undefined {
  if (current.fy === undefined || !current.fp) return undefined;
  return points.find(
    (p) => p.fy === current.fy! - 1 && p.fp === current.fp,
  );
}

function priorFiscalYear(
  points: MetricSeriesPoint[],
  current: MetricSeriesPoint,
): MetricSeriesPoint | undefined {
  if (current.fy === undefined) return undefined;
  return points.find((p) => p.fy === current.fy! - 1 && p.fp === "FY");
}

function enrichQuarterlyDeltas(
  points: MetricSeriesPoint[],
): MetricSeriesPoint[] {
  return points.map((point, index) => {
    const priorQ = priorQuarterPoint(points, index);
    const priorY = sameQuarterPriorYear(points, point);
    return {
      ...point,
      deltaQoq: pctChange(point.value, priorQ?.value),
      deltaYoy: pctChange(point.value, priorY?.value),
    };
  });
}

function enrichAnnualDeltas(
  points: MetricSeriesPoint[],
): MetricSeriesPoint[] {
  return points.map((point) => {
    const prior = priorFiscalYear(points, point);
    return {
      ...point,
      deltaYoy: pctChange(point.value, prior?.value),
    };
  });
}

export function enrichMetricSeriesDeltas(series: {
  annual: MetricSeriesPoint[];
  quarterly: MetricSeriesPoint[];
}): { annual: MetricSeriesPoint[]; quarterly: MetricSeriesPoint[] } {
  return {
    annual: enrichAnnualDeltas(series.annual),
    quarterly: enrichQuarterlyDeltas(series.quarterly),
  };
}
