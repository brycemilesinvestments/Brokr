import type { CompanyFactsResponse } from "@/lib/edgar";
import { buildConceptSeriesFromFacts } from "@/lib/metrics/series-helpers";
import type { BacklogSeries, DerivedMetricPoint } from "@/lib/metrics/types";

const RPO_CONCEPT = "RevenueRemainingPerformanceObligation";

function toDerivedPoints(
  points: Array<{ periodEnd: string; value: number; fy?: number; fp?: string }>,
  frequency: "annual" | "quarterly",
): DerivedMetricPoint[] {
  return points.map((p) => ({
    periodEnd: p.periodEnd,
    frequency,
    value: p.value,
    fy: p.fy,
    fp: p.fp,
  }));
}

export function computeBacklogSeries(rawFacts: CompanyFactsResponse): BacklogSeries {
  const rpoSeries = buildConceptSeriesFromFacts(rawFacts, RPO_CONCEPT);

  if (rpoSeries.status === "not_reported") {
    return {
      concept: RPO_CONCEPT,
      status: "not_reported",
      annual: [],
      quarterly: [],
    };
  }

  return {
    concept: RPO_CONCEPT,
    status: "reported",
    unit: rpoSeries.unit,
    annual: toDerivedPoints(rpoSeries.annual, "annual"),
    quarterly: toDerivedPoints(rpoSeries.quarterly, "quarterly"),
  };
}
