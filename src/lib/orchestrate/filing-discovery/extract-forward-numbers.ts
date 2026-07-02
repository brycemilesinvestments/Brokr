import type { CompanyFactsResponse } from "@/lib/edgar/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import { FORWARD_NUMERIC_CONCEPTS } from "@/lib/edgar/discovery";
import type {
  ForwardSignalSeries,
  ForwardSignals,
  SegmentGrowthRate,
  SignalSeriesPoint,
} from "@/lib/edgar/discovery";
import { buildConceptSeriesFromFacts } from "@/lib/metrics/series-helpers";
import { computeSegmentBreakout } from "@/lib/metrics/segments";
import type { SeriesFrequency } from "@/lib/edgar/time-series/types";

function toSignalPoints(
  points: Array<{ periodEnd: string; value: number; fy?: number; fp?: string }>,
  frequency: SeriesFrequency,
): SignalSeriesPoint[] {
  return points.map((p) => ({
    periodEnd: p.periodEnd,
    value: p.value,
    frequency,
    fy: p.fy,
    fp: p.fp,
  }));
}

function conceptToForwardSeries(
  response: CompanyFactsResponse,
  concept: string,
): ForwardSignalSeries {
  const series = buildConceptSeriesFromFacts(response, concept);

  if (series.status === "not_reported") {
    return { concept, status: "not_reported", annual: [], quarterly: [] };
  }

  return {
    concept,
    status: "reported",
    unit: series.unit,
    annual: toSignalPoints(series.annual, "annual"),
    quarterly: toSignalPoints(series.quarterly, "quarterly"),
  };
}

function computeSegmentGrowthRates(ixbrlFacts: XbrlFact[]): SegmentGrowthRate[] {
  const breakout = computeSegmentBreakout(ixbrlFacts);
  const rates: SegmentGrowthRate[] = [];

  for (const segment of [...breakout.endMarket, ...breakout.geography]) {
    if (segment.quarterly.length < 2) continue;

    const sorted = [...segment.quarterly].sort((a, b) =>
      a.periodEnd.localeCompare(b.periodEnd),
    );
    const prior = sorted[sorted.length - 2];
    const current = sorted[sorted.length - 1];

    if (!prior?.value || prior.value === 0) continue;

    rates.push({
      segmentName: segment.segmentName,
      dimension: segment.dimension,
      currentPeriodEnd: current.periodEnd,
      priorPeriodEnd: prior.periodEnd,
      currentValue: current.value,
      priorValue: prior.value,
      growthRate: (current.value - prior.value) / prior.value,
    });
  }

  return rates.sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate));
}

/** D4 — Extract forward-looking numeric signals without AI. */
export function extractForwardNumbers(
  companyFacts: CompanyFactsResponse,
  ixbrlFacts: XbrlFact[] = [],
): ForwardSignals {
  return {
    backlog: conceptToForwardSeries(companyFacts, FORWARD_NUMERIC_CONCEPTS.backlog),
    customerConcentration: conceptToForwardSeries(
      companyFacts,
      FORWARD_NUMERIC_CONCEPTS.customerConcentration,
    ),
    segmentGrowth: computeSegmentGrowthRates(ixbrlFacts),
  };
}
