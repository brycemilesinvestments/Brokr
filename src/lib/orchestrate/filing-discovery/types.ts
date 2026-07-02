import type {
  ConceptClassification,
  CoverageDelta,
  ForwardSignals,
  ProseSections,
  UniverseConcept,
} from "@/lib/edgar/discovery";
import type { QualitativeSignalsResult } from "@/lib/ai/qualitative-types";

export type { QualitativeSignalsResult };

export type CrossCheckResult = {
  field: string;
  numericValue?: number;
  proseValue?: number;
  tolerance: number;
  agrees: boolean;
  message?: string;
};

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

export type FilingDiscoveryConfig = {
  maxIterations: number;
  maxCostUsd: number;
};

export type FilingDiscoveryOutput = {
  cik: string;
  accessionNumber: string;
  universe: UniverseConcept[];
  coverage: CoverageDelta;
  classifications: ConceptClassification[];
  forwardSignals: ForwardSignals;
  proseSections: ProseSections;
  qualitativeSignals: QualitativeSignalsResult | null;
  crossCheckResults: CrossCheckResult[];
  cacheHit: boolean;
  completed: boolean;
  terminatedReason: "complete" | "max_iterations" | "budget_exceeded";
  iterations: number;
  costUsd: number;
  errors: string[];
};
