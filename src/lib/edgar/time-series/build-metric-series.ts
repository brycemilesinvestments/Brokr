import type { CompanyFactsResponse } from "@/lib/edgar/types";
import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar/time-series/constants";
import { classifyFrequency } from "@/lib/edgar/time-series/classify-frequency";
import { tagPointAuditStatus } from "@/lib/edgar/time-series/audit-status";
import { extractConceptPoints } from "@/lib/edgar/time-series/extract-points";
import { dedupeSeries, detectGaps } from "@/lib/edgar/time-series/process-series";
import type { MetricSeries, MetricSeriesBundle, RawTimeSeriesPoint } from "@/lib/edgar/time-series/types";

function partitionPoints(points: RawTimeSeriesPoint[]): {
  annual: RawTimeSeriesPoint[];
  quarterly: RawTimeSeriesPoint[];
} {
  const annual: RawTimeSeriesPoint[] = [];
  const quarterly: RawTimeSeriesPoint[] = [];

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
    if (frequency === "annual") annual.push(point);
    else if (frequency === "quarterly") quarterly.push(point);
  }

  return { annual, quarterly };
}

function buildMetricSeries(
  concept: string,
  points: RawTimeSeriesPoint[],
  unit: string | undefined,
  reported: boolean,
): MetricSeries {
  if (!reported) {
    return {
      concept,
      status: "not_reported",
      annual: [],
      quarterly: [],
      gaps: [],
    };
  }

  const { annual: rawAnnual, quarterly: rawQuarterly } = partitionPoints(points);
  const annual = dedupeSeries(rawAnnual, "annual");
  const quarterly = dedupeSeries(rawQuarterly, "quarterly");

  const gaps = [...detectGaps(annual), ...detectGaps(quarterly)];

  return {
    concept,
    status: "reported",
    unit,
    annual: annual.map((p) => tagPointAuditStatus(p)),
    quarterly: quarterly.map((p) => tagPointAuditStatus(p)),
    gaps,
  };
}

/** Build raw metric series from SEC companyfacts (C1–C6). */
export function buildMetricSeriesBundle(
  response: CompanyFactsResponse,
): MetricSeriesBundle {
  const series: Record<string, MetricSeries> = {};

  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const { points, unit, reported } = extractConceptPoints(response, concept);
    series[concept] = buildMetricSeries(concept, points, unit, reported);
  }

  return {
    cik: response.cik,
    entityName: response.entityName,
    series,
  };
}
