import type { CompanyFactsResponse } from "@/lib/edgar/types";
import { ALL_WHITELISTED_CONCEPTS, QUARTER_FPS } from "@/lib/edgar/time-series";
import { classifyFrequency } from "@/lib/edgar/time-series/classify-frequency";
import { extractConceptPoints } from "@/lib/edgar/time-series/extract-points";
import type { MetricSeriesBundle, MetricSeriesPoint } from "@/lib/edgar/time-series";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import type { StructuredMetric } from "@/lib/rag/types";

const QUARTER_FP_SET = new Set<string>(QUARTER_FPS);

function humanizeConcept(concept: string): string {
  return concept
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function durationDays(point: { start?: string; periodEnd: string }): number {
  if (!point.start) return 90;
  const startMs = Date.parse(point.start);
  const endMs = Date.parse(point.periodEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 90;
  return Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
}

function pickRepresentativeQuarterly<T extends { periodEnd: string; fp?: string; start?: string }>(
  points: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const point of points) {
    const key = `${point.periodEnd}:${point.fp ?? ""}`;
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }

  const picked: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      picked.push(group[0]);
      continue;
    }
    picked.push(
      group.reduce((best, point) => (durationDays(point) < durationDays(best) ? point : best)),
    );
  }
  return picked;
}

function metricsFromCompanyFacts(companyId: string, response: CompanyFactsResponse): StructuredMetric[] {
  const metrics: StructuredMetric[] = [];

  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const { points, unit, reported } = extractConceptPoints(response, concept);
    if (!reported) continue;

    const annual = points.filter((point) => classifyFrequency({
      end: point.periodEnd,
      start: point.start,
      val: point.value,
      fp: point.fp,
      fy: point.fy,
      filed: point.filed,
      form: point.form,
      accn: point.accn,
    }) === "annual");
    const quarterly = pickRepresentativeQuarterly(
      points.filter((point) =>
        point.fp ? QUARTER_FP_SET.has(point.fp) : false,
      ),
    );

    for (const point of [...annual, ...quarterly]) {
      metrics.push({
        companyId,
        metricName: concept,
        displayName: humanizeConcept(concept),
        periodEnd: point.periodEnd,
        fp: point.fp,
        fy: point.fy,
        value: point.value,
        unit,
        accession: point.accn,
      });
    }
  }

  return metrics;
}

function bundleToMetrics(companyId: string, bundle: MetricSeriesBundle): StructuredMetric[] {
  const metrics: StructuredMetric[] = [];

  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = bundle.series[concept];
    if (!series || series.status === "not_reported") continue;

    const quarterly = pickRepresentativeQuarterly(series.quarterly);

    for (const point of [...series.annual, ...quarterly] as MetricSeriesPoint[]) {
      metrics.push({
        companyId,
        metricName: concept,
        displayName: humanizeConcept(concept),
        periodEnd: point.periodEnd,
        fp: point.fp,
        fy: point.fy,
        value: point.value,
        unit: series.unit,
        accession: point.accn,
      });
    }
  }

  return metrics;
}

/** I3 — Index deterministic metric series for direct name + period lookup. */
export async function indexStructured(
  store: ChunkStore,
  input: {
    companyId: string;
    accession: string;
    bundle: MetricSeriesBundle;
    companyFacts?: CompanyFactsResponse;
    replaceCompany?: boolean;
  },
): Promise<{ indexed: number }> {
  const metrics = input.companyFacts
    ? metricsFromCompanyFacts(input.companyId, input.companyFacts)
    : bundleToMetrics(input.companyId, input.bundle);

  if (input.replaceCompany) {
    await store.deleteMetricsForCompany(input.companyId);
  }

  await store.upsertMetrics(metrics);
  await store.upsertIngestStatus({
    companyId: input.companyId,
    accession: input.accession,
    structuredDone: true,
  });

  return { indexed: metrics.length };
}
