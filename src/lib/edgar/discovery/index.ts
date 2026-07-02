export type {
  UniverseConcept,
  CoverageDelta,
  ConceptTag,
  ConceptClassification,
  SignalSeriesPoint,
  ForwardSignalSeries,
  SegmentGrowthRate,
  ForwardSignals,
  ProseSectionKey,
  ProseSection,
  ProseSections,
} from "@/lib/edgar/discovery/types";

export {
  TIER1_USEFUL_CONCEPTS,
  SEGMENT_REVENUE_PATTERNS,
  PROSE_TEXT_BLOCK_CONCEPTS,
  FORWARD_NUMERIC_CONCEPTS,
} from "@/lib/edgar/discovery/constants";

export { enumerateConcepts } from "@/lib/edgar/discovery/enumerate-concepts";
export { computeCoverageDelta } from "@/lib/edgar/discovery/coverage-delta";
export { classifyConcepts } from "@/lib/edgar/discovery/classify-concepts";
export { locateProseSections } from "@/lib/edgar/discovery/locate-prose-sections";
