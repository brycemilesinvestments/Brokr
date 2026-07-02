import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar/time-series/constants";
import {
  IGNORABLE_DEI_CONCEPTS,
  SEGMENT_REVENUE_PATTERNS,
  STANDARD_TAXONOMIES,
  TIER1_USEFUL_CONCEPTS,
} from "@/lib/edgar/discovery/constants";
import type { ConceptClassification, ConceptTag, UniverseConcept } from "@/lib/edgar/discovery/types";

const WHITELIST_SET = new Set<string>(ALL_WHITELISTED_CONCEPTS);
const TIER1_SET = new Set<string>(TIER1_USEFUL_CONCEPTS);

function isTextBlock(concept: string): boolean {
  return concept.includes("TextBlock");
}

function isSegmentRevenueConcept(concept: string): boolean {
  return SEGMENT_REVENUE_PATTERNS.some((pattern) => pattern.test(concept));
}

function classifyOne(entry: UniverseConcept): ConceptTag {
  const { concept, taxonomy } = entry;

  if (WHITELIST_SET.has(concept)) return "core";

  if (TIER1_SET.has(concept) || isSegmentRevenueConcept(concept)) {
    return "known_useful";
  }

  if (!STANDARD_TAXONOMIES.has(taxonomy)) {
    return "company_specific";
  }

  if (taxonomy === "dei" || IGNORABLE_DEI_CONCEPTS.has(concept)) {
    return "ignorable";
  }

  if (isTextBlock(concept)) {
    return "ignorable";
  }

  return "ignorable";
}

/** D3 — Tag every universe concept; none left unclassified. */
export function classifyConcepts(universe: UniverseConcept[]): ConceptClassification[] {
  return universe.map((entry) => ({
    concept: entry.concept,
    taxonomy: entry.taxonomy,
    tag: classifyOne(entry),
  }));
}
