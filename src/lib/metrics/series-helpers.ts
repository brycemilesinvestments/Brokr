import { safeDivide } from "@/lib/analysis";
import type { CompanyFactsResponse } from "@/lib/edgar";
import {
  classifyFrequency,
  dedupeSeries,
  extractConceptPoints,
  type MetricSeries,
  type MetricSeriesBundle,
  type MetricSeriesPoint,
  type RawTimeSeriesPoint,
  type SeriesFrequency,
} from "@/lib/edgar/time-series";
import type {
  DerivedMetricKey,
  DerivedMetricPoint,
  DerivedMetricSeries,
  MissingMetricReason,
} from "@/lib/metrics/types";

export function valueAtPeriod(
  series: MetricSeries | undefined,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  if (!series || series.status === "not_reported") return undefined;
  const points = frequency === "annual" ? series.annual : series.quarterly;
  return points.find((p) => p.periodEnd === periodEnd)?.value;
}

export function pointAtPeriod(
  series: MetricSeries | undefined,
  periodEnd: string,
  frequency: SeriesFrequency,
): MetricSeriesPoint | undefined {
  if (!series || series.status === "not_reported") return undefined;
  const points = frequency === "annual" ? series.annual : series.quarterly;
  return points.find((p) => p.periodEnd === periodEnd);
}

export function daysInPeriod(
  point: MetricSeriesPoint | undefined,
  frequency: SeriesFrequency,
): number {
  if (point?.start) {
    const startMs = Date.parse(point.start);
    const endMs = Date.parse(point.periodEnd);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
      const days = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
      if (days > 0) return days;
    }
  }
  return frequency === "annual" ? 365 : 90;
}

function notReportedSeries(key: DerivedMetricKey): DerivedMetricSeries {
  return { key, status: "not_reported", annual: [], quarterly: [] };
}

type PeriodAnchor = { periodEnd: string; frequency: SeriesFrequency; fy?: number; fp?: string };

function anchorPeriods(series: MetricSeries | undefined): PeriodAnchor[] {
  if (!series || series.status === "not_reported") return [];
  return [
    ...series.annual.map((p) => ({
      periodEnd: p.periodEnd,
      frequency: "annual" as const,
      fy: p.fy,
      fp: p.fp,
    })),
    ...series.quarterly.map((p) => ({
      periodEnd: p.periodEnd,
      frequency: "quarterly" as const,
      fy: p.fy,
      fp: p.fp,
    })),
  ];
}

type ComputeResult = { value?: number; skipReason?: string; missingConcept?: string };

export function buildDerivedSeries(
  key: DerivedMetricKey,
  anchor: MetricSeries | undefined,
  compute: (
    period: PeriodAnchor,
    anchorPoint: MetricSeriesPoint | undefined,
  ) => ComputeResult,
): { series: DerivedMetricSeries; missing: MissingMetricReason[] } {
  if (!anchor || anchor.status === "not_reported") {
    return { series: notReportedSeries(key), missing: [] };
  }

  const missing: MissingMetricReason[] = [];
  const annual: DerivedMetricPoint[] = [];
  const quarterly: DerivedMetricPoint[] = [];

  for (const period of anchorPeriods(anchor)) {
    const anchorPoint = pointAtPeriod(anchor, period.periodEnd, period.frequency);
    const result = compute(period, anchorPoint);
    const point: DerivedMetricPoint = {
      periodEnd: period.periodEnd,
      frequency: period.frequency,
      fy: period.fy,
      fp: period.fp,
      value: result.value,
      skipReason: result.skipReason,
    };

    if (result.value === undefined && result.skipReason) {
      missing.push({
        metric: key,
        periodEnd: period.periodEnd,
        frequency: period.frequency,
        reason: result.skipReason,
        missingConcept: result.missingConcept,
      });
    }

    if (period.frequency === "annual") annual.push(point);
    else quarterly.push(point);
  }

  return {
    series: {
      key,
      status: "reported",
      unit: anchor.unit,
      annual,
      quarterly,
    },
    missing,
  };
}

export function buildConceptSeriesFromFacts(
  response: CompanyFactsResponse,
  concept: string,
): MetricSeries {
  const { points, unit, reported } = extractConceptPoints(response, concept);
  if (!reported) {
    return { concept, status: "not_reported", annual: [], quarterly: [], gaps: [] };
  }

  const annualRaw: RawTimeSeriesPoint[] = [];
  const quarterlyRaw: RawTimeSeriesPoint[] = [];

  for (const point of points) {
    const raw = {
      end: point.periodEnd,
      start: point.start,
      val: point.value,
      fy: point.fy,
      fp: point.fp,
      form: point.form,
      filed: point.filed,
      accn: point.accn,
    };
    const frequency = classifyFrequency(raw);
    const target = frequency === "annual" ? annualRaw : quarterlyRaw;
    target.push(point);
  }

  return {
    concept,
    status: "reported",
    unit,
    annual: dedupeSeries(annualRaw, "annual"),
    quarterly: dedupeSeries(quarterlyRaw, "quarterly"),
    gaps: [],
  };
}

export function subtractSeriesValues(
  minuend: number | undefined,
  subtrahend: number | undefined,
): number | undefined {
  if (minuend === undefined || subtrahend === undefined) return undefined;
  return minuend - Math.abs(subtrahend);
}

export function ratioOf(numerator?: number, denominator?: number): number | undefined {
  return safeDivide(numerator, denominator);
}

export function getMetricSeries(
  bundle: MetricSeriesBundle,
  concept: string,
): MetricSeries | undefined {
  return bundle.series[concept];
}
