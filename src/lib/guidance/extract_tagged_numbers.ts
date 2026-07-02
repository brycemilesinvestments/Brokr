import type { XbrlFact } from "@/lib/edgar";
import type { GuidanceMetric, TaggedNumber } from "@/lib/guidance/types";

const CONCEPT_TO_METRIC: Array<{ matcher: RegExp; metric: GuidanceMetric }> = [
  { matcher: /revenue|sales/i, metric: "revenue" },
  { matcher: /earningspershare|eps|diluted/iu, metric: "eps" },
  { matcher: /ebitda/iu, metric: "ebitda" },
  { matcher: /operatingincome|operatingprofit/iu, metric: "operating_income" },
  { matcher: /grossmargin|grossprofit/iu, metric: "gross_margin" },
  { matcher: /netincome|profit/iu, metric: "net_income" },
  { matcher: /cashflow|operatingcashflow|freecashflow/iu, metric: "cash_flow" },
  { matcher: /capex|capitalexpenditure/iu, metric: "capex" },
];

function classifyMetric(concept: string): GuidanceMetric {
  for (const entry of CONCEPT_TO_METRIC) {
    if (entry.matcher.test(concept)) return entry.metric;
  }
  return "other";
}

/**
 * G2 — Extract numeric XBRL tags likely used in earnings guidance language.
 */
export function extract_tagged_numbers(
  accessionNumber: string,
  facts: XbrlFact[],
): TaggedNumber[] {
  const extracted: TaggedNumber[] = [];

  for (const fact of facts) {
    if (typeof fact.numericValue !== "number" || !Number.isFinite(fact.numericValue)) {
      continue;
    }

    extracted.push({
      accessionNumber,
      concept: fact.concept,
      taxonomy: fact.taxonomy,
      metric: classifyMetric(fact.concept),
      value: fact.numericValue,
      periodEnd: fact.context?.endDate ?? fact.context?.instant,
      unit: fact.unit,
    });
  }

  const dedup = new Map<string, TaggedNumber>();
  for (const row of extracted) {
    const key = `${row.metric}|${row.concept}|${row.periodEnd ?? ""}|${row.value}|${row.unit ?? ""}`;
    if (!dedup.has(key)) dedup.set(key, row);
  }

  return [...dedup.values()].sort((a, b) => {
    const metricCmp = a.metric.localeCompare(b.metric);
    if (metricCmp !== 0) return metricCmp;

    const periodCmp = (a.periodEnd ?? "").localeCompare(b.periodEnd ?? "");
    if (periodCmp !== 0) return periodCmp;

    return a.concept.localeCompare(b.concept);
  });
}
