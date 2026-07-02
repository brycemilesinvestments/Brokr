import type { CompanyFactUnit, CompanyFactsResponse } from "@/lib/edgar/types";
import { classifyFrequency } from "@/lib/edgar/time-series/classify-frequency";
import type { SeriesFrequency } from "@/lib/edgar/time-series/types";
import type { UniverseConcept } from "@/lib/edgar/discovery/types";

function collectFrequencies(
  units: Record<string, CompanyFactUnit[]>,
): SeriesFrequency[] {
  const frequencies = new Set<SeriesFrequency>();

  for (const points of Object.values(units)) {
    for (const point of points) {
      const freq = classifyFrequency(point);
      if (freq) frequencies.add(freq);
    }
  }

  return [...frequencies].toSorted();
}

function countDataPoints(
  units: Record<string, CompanyFactUnit[]>,
): number {
  let count = 0;
  for (const points of Object.values(units)) {
    count += points.filter((p) => p.val !== undefined && !Number.isNaN(p.val)).length;
  }
  return count;
}

/** D1 — Walk entire companyfacts response and enumerate every concept. */
export function enumerateConcepts(response: CompanyFactsResponse): UniverseConcept[] {
  const universe: UniverseConcept[] = [];

  for (const [taxonomy, concepts] of Object.entries(response.facts)) {
    for (const [concept, fact] of Object.entries(concepts)) {
      if (!fact?.units) continue;

      const dataPointCount = countDataPoints(fact.units);
      const frequencies = collectFrequencies(fact.units);

      universe.push({
        concept,
        taxonomy,
        dataPointCount,
        frequencies,
      });
    }
  }

  return universe.sort((a, b) => b.dataPointCount - a.dataPointCount);
}
