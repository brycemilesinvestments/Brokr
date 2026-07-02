import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar/time-series/constants";
import type { CoverageDelta, UniverseConcept } from "@/lib/edgar/discovery/types";

/** D2 — Compute M-of-N coverage and unsurfaced concepts sorted by data_point_count. */
export function computeCoverageDelta(universe: UniverseConcept[]): CoverageDelta {
  const whitelistSet = new Set<string>(ALL_WHITELISTED_CONCEPTS);
  const universeByConcept = new Map(universe.map((u) => [u.concept, u]));

  const whitelistPresent = ALL_WHITELISTED_CONCEPTS.filter((concept) =>
    universeByConcept.has(concept),
  );

  const unsurfaced = universe
    .reduce<NonNullable<CoverageDelta["unsurfaced"]>>((acc, u) => {
      if (!whitelistSet.has(u.concept)) {
        acc.push({
          concept: u.concept,
          taxonomy: u.taxonomy,
          dataPointCount: u.dataPointCount,
          frequencies: u.frequencies,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.dataPointCount - a.dataPointCount);

  return {
    whitelistPresent: whitelistPresent.length,
    universeTotal: universe.length,
    whitelistConcepts: [...whitelistPresent],
    unsurfaced,
  };
}
