export type {
  FilingDiffAction,
  CanonicalForm,
  FilingPair,
  NumericMetricMap,
  NumericDiffItem,
  NumericDiffResult,
  StructuralSnapshot,
  StructuralDiffResult,
  ProseSectionKey,
  ScopedProseSection,
  ProseDiffSection,
  ProseDiffResult,
  ProseDiffModelResponse,
  ProseDiffModel,
  FilingDiffCacheKey,
  FilingDiffSeverity,
  SeverityRanking,
  FilingDiffOutput,
  FilingDiffState,
  FilingDiffCache,
  FilingDiffRouterInput,
} from "@/lib/filing-diff/types";

export { pairFilings } from "@/lib/filing-diff/pair_filings";
export { computeNumericDiff } from "@/lib/filing-diff/numeric_diff";
export {
  buildStructuralSnapshot,
  computeStructuralDiff,
} from "@/lib/filing-diff/structural_diff";
export {
  checkDiffCache,
  buildFilingDiffCacheKey,
  type DiffCacheCheckResult,
} from "@/lib/filing-diff/check_diff_cache";
export { diffProse, DEFAULT_PROSE_SECTION_CHAR_LIMIT } from "@/lib/filing-diff/prose_diff";
export { writeDiffCache } from "@/lib/filing-diff/write_cache";
export { rankSeverity } from "@/lib/filing-diff/rank_severity";
export { routeFilingDiffAction, runFilingDiffRouter } from "@/lib/filing-diff/router";
