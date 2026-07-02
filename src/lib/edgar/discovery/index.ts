export type {
  UniverseConcept,
  CoverageDelta,
  ConceptTag,
  ConceptClassification,
  SignalSeriesPoint,
  ForwardSignalSeries,
  SegmentGrowthRate,
  ForwardSignals,
  Form10kSectionKey,
  ProseSectionKey,
  ProseSection,
  ProseSections,
  ProseSectionSource,
  SectionCoverage,
} from "@/lib/edgar/discovery/types";

export {
  TIER1_USEFUL_CONCEPTS,
  SEGMENT_REVENUE_PATTERNS,
  PROSE_TEXT_BLOCK_CONCEPTS,
  AUDITOR_NAME_CONCEPTS,
  FORWARD_NUMERIC_CONCEPTS,
} from "@/lib/edgar/discovery/constants";

export { enumerateConcepts } from "@/lib/edgar/discovery/enumerate-concepts";
export { computeCoverageDelta } from "@/lib/edgar/discovery/coverage-delta";
export { classifyConcepts } from "@/lib/edgar/discovery/classify-concepts";
export { locateProseSections } from "@/lib/edgar/discovery/locate-prose-sections";
export {
  extractHtmlHeadingSections,
  IXBRL_SECTION_THRESHOLD,
  countNarrativeIxbrlSections,
} from "@/lib/edgar/discovery/extract-html-heading-sections";
export {
  locateForm10kSections,
  buildSectionCoverage,
  extractAuditorName,
} from "@/lib/edgar/discovery/locate-form10k-sections";
export { emptyProseSections } from "@/lib/edgar/discovery/empty-prose-sections";
