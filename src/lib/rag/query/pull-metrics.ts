import { REVENUE_CONCEPT } from "@/lib/rag/constants";
import { extractFpHint, extractMetricHints } from "@/lib/rag/query/route-question";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import type { StructuredMetric } from "@/lib/rag/types";

function formatValue(value: number, unit?: string): string {
  const abs = Math.abs(value);
  if (unit === "USD" || !unit) {
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toLocaleString()}`;
  }
  return `${value.toLocaleString()} ${unit}`;
}

function pickLatestQuarter(metrics: StructuredMetric[], fp?: string | null): StructuredMetric | undefined {
  const quarterly = metrics.filter((m) => !fp || m.fp === fp);
  return quarterly.sort((a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd))[0];
}

function isSingleQuarterMetric(metric: StructuredMetric, allForConcept: StructuredMetric[]): boolean {
  const samePeriod = allForConcept.filter((m) => m.periodEnd === metric.periodEnd);
  if (samePeriod.length <= 1) return true;
  return metric.value === Math.min(...samePeriod.map((m) => m.value));
}

/** Pull exact structured metrics — never from prose. */
export async function pullMetrics(
  store: ChunkStore,
  input: {
    companyId: string;
    question: string;
    periodEnd?: string | null;
  },
): Promise<StructuredMetric[]> {
  const hints = extractMetricHints(input.question);
  const fpHint = extractFpHint(input.question);
  const metricNames = hints.filter((h) => !h.startsWith("fp:"));

  if (metricNames.length === 0) {
    metricNames.push(REVENUE_CONCEPT);
  }

  let metrics = await store.queryMetrics({
    companyId: input.companyId,
    metricNames,
    periodEnd: input.periodEnd ?? undefined,
    fp: fpHint ?? undefined,
  });

  if (metrics.length === 0 && input.periodEnd) {
    metrics = await store.queryMetrics({
      companyId: input.companyId,
      metricNames,
      periodEnd: input.periodEnd,
    });
  }

  if (metrics.length === 0) {
    metrics = await store.queryMetrics({
      companyId: input.companyId,
      metricNames,
      fp: fpHint ?? undefined,
    });
  }

  if (fpHint && metrics.length > 0) {
    const byConcept = new Map<string, StructuredMetric[]>();
    for (const metric of metrics) {
      const group = byConcept.get(metric.metricName) ?? [];
      group.push(metric);
      byConcept.set(metric.metricName, group);
    }

    const narrowed: StructuredMetric[] = [];
    for (const [, group] of byConcept) {
      const quarterlyOnly = group.filter((m) => m.fp === fpHint);
      const candidates = quarterlyOnly.length > 0 ? quarterlyOnly : group;
      const singleQuarter = candidates.filter((m) => isSingleQuarterMetric(m, candidates));
      const pool = singleQuarter.length > 0 ? singleQuarter : candidates;
      const latest = pickLatestQuarter(pool, fpHint);
      if (latest) narrowed.push(latest);
    }
    return narrowed;
  }

  return metrics;
}

export function formatMetricForContext(metric: StructuredMetric): string {
  return `${metric.displayName} (${metric.fp ?? "period"} ended ${metric.periodEnd}): ${formatValue(metric.value, metric.unit)} [structured:${metric.metricName}]`;
}

export { formatValue };
