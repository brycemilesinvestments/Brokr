import type { CompanyFactsResponse } from "@/lib/edgar/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import { STANDARD_TAXONOMIES } from "@/lib/edgar/discovery/constants";
import { enumerateConcepts } from "@/lib/edgar/discovery";
import type { XbrlUniverseReport } from "@/lib/agent/form-10k";

/** K2 — Extract full iXBRL fact universe and compare against companyfacts. */
export function extractXbrlUniverse(
  ixbrlFacts: XbrlFact[],
  companyFacts: CompanyFactsResponse,
): XbrlUniverseReport {
  const companyfactsConceptCount = enumerateConcepts(companyFacts).length;
  const coverageByTaxonomy: Record<string, number> = {};

  let customNamespaceFacts = 0;
  for (const fact of ixbrlFacts) {
    coverageByTaxonomy[fact.taxonomy] = (coverageByTaxonomy[fact.taxonomy] ?? 0) + 1;
    if (!STANDARD_TAXONOMIES.has(fact.taxonomy) && fact.taxonomy.length > 0) {
      customNamespaceFacts += 1;
    }
  }

  return {
    ixbrlFactCount: ixbrlFacts.length,
    companyfactsConceptCount,
    ixbrlExceedsCompanyfacts: ixbrlFacts.length > companyfactsConceptCount,
    customNamespaceFacts,
    coverageByTaxonomy,
  };
}
