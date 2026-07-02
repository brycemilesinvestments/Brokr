import type { CompanyFactsResponse, CompanyFactUnit } from "@/lib/edgar/types";
import { taxonomyForConcept } from "@/lib/edgar/time-series/constants";
import type { RawTimeSeriesPoint } from "@/lib/edgar/time-series/types";

function unitToPoint(unit: string, raw: CompanyFactUnit): RawTimeSeriesPoint | undefined {
  if (!raw.end || raw.val === undefined || Number.isNaN(raw.val)) return undefined;

  return {
    periodEnd: raw.end,
    value: raw.val,
    fy: raw.fy,
    fp: raw.fp,
    filed: raw.filed,
    form: raw.form,
    accn: raw.accn,
    unit,
    start: raw.start,
  };
}

export function conceptExistsInFacts(
  response: CompanyFactsResponse,
  concept: string,
): boolean {
  for (const taxonomy of taxonomyForConcept(concept)) {
    if (response.facts[taxonomy]?.[concept]) return true;
  }
  return false;
}

export function extractConceptPoints(
  response: CompanyFactsResponse,
  concept: string,
): { points: RawTimeSeriesPoint[]; unit?: string; reported: boolean } {
  for (const taxonomy of taxonomyForConcept(concept)) {
    const fact = response.facts[taxonomy]?.[concept];
    if (!fact?.units) continue;

    const entries = Object.entries(fact.units);
    if (entries.length === 0) continue;

    const [unit, rawPoints] = entries[0];
    const points = rawPoints
      .map((raw) => unitToPoint(unit, raw))
      .filter((p): p is RawTimeSeriesPoint => p !== undefined);

    return { points, unit, reported: true };
  }

  return { points: [], reported: false };
}
