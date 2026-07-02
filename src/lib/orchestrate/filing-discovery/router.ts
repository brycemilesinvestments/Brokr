import type {
  ConceptClassification,
  CoverageDelta,
  ForwardSignals,
  ProseSections,
  UniverseConcept,
} from "@/lib/edgar/discovery";
import type { QualitativeSignalsResult } from "@/lib/ai/qualitative-types";
import type {
  CrossCheckResult,
} from "@/lib/orchestrate/filing-discovery/types";

export type FilingDiscoveryAction =
  | "enumerate_concepts"
  | "compute_coverage_delta"
  | "classify_concepts"
  | "extract_forward_numbers"
  | "locate_prose_sections"
  | "check_signal_cache"
  | "extract_prose_signals"
  | "write_cache"
  | "cross_check"
  | "complete";

export type FilingDiscoveryState = {
  cik: string;
  accessionNumber: string;
  iteration: number;
  costUsd: number;
  completed: boolean;
  universe: UniverseConcept[] | null;
  coverage: CoverageDelta | null;
  classifications: ConceptClassification[] | null;
  forwardSignals: ForwardSignals | null;
  proseSections: ProseSections | null;
  qualitativeSignals: QualitativeSignalsResult | null;
  cacheHit: boolean;
  crossCheckResults: CrossCheckResult[] | null;
  actionsTaken: FilingDiscoveryAction[];
  errors: string[];
};

export function routeFilingDiscoveryAction(state: FilingDiscoveryState): FilingDiscoveryAction {
  if (state.completed) return "complete";
  if (state.universe === null) return "enumerate_concepts";
  if (state.coverage === null) return "compute_coverage_delta";
  if (state.classifications === null) return "classify_concepts";
  if (state.forwardSignals === null) return "extract_forward_numbers";
  if (state.proseSections === null) return "locate_prose_sections";
  if (!state.actionsTaken.includes("check_signal_cache")) return "check_signal_cache";
  if (state.qualitativeSignals === null && !state.cacheHit) return "extract_prose_signals";
  if (
    state.qualitativeSignals !== null &&
    state.qualitativeSignals !== "skipped_budget" &&
    !state.actionsTaken.includes("write_cache") &&
    !state.cacheHit
  ) {
    return "write_cache";
  }
  if (state.crossCheckResults === null) return "cross_check";
  return "complete";
}
