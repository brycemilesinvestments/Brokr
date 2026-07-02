import type { ProseSections } from "@/lib/edgar/discovery";
import type { FilingRef } from "@/lib/edgar/types";

export type FilingDiffAction =
  | "pair_filings"
  | "numeric_diff"
  | "structural_diff"
  | "check_diff_cache"
  | "prose_diff"
  | "write_cache"
  | "rank_severity"
  | "complete";

export type CanonicalForm = "10-Q" | "10-K";

export type FilingPair = {
  cik: string;
  form: CanonicalForm;
  current: FilingRef;
  previous: FilingRef;
};

export type NumericMetricMap = Record<string, number | null | undefined>;

export type NumericDiffItem = {
  metric: string;
  current?: number;
  previous?: number;
  delta?: number;
  deltaPct?: number;
  changed: boolean;
};

export type NumericDiffResult = {
  items: NumericDiffItem[];
  changedCount: number;
};

export type StructuralSnapshot = {
  hasMda: boolean;
  hasRiskFactors: boolean;
  hasRevenueConcentration: boolean;
  hasGuidance: boolean;
  riskTags: string[];
};

export type StructuralDiffResult = {
  changed: boolean;
  changedFields: Array<keyof Omit<StructuralSnapshot, "riskTags"> | "riskTags">;
  current: StructuralSnapshot;
  previous: StructuralSnapshot;
  addedRiskTags: string[];
  removedRiskTags: string[];
};

export type ProseSectionKey = "mda" | "risk_factors";

export type ScopedProseSection = {
  key: ProseSectionKey;
  currentText: string;
  previousText: string;
};

export type ProseDiffSection = {
  key: ProseSectionKey;
  changed: boolean;
  summary?: string;
};

export type ProseDiffResult = {
  changed: boolean;
  sections: ProseDiffSection[];
  refusal: boolean;
  costUsd: number;
  model?: string;
};

export type ProseDiffModelResponse = Partial<ProseDiffResult> & {
  changed?: boolean;
  sections?: ProseDiffSection[];
};

export type ProseDiffModel = (input: {
  sections: ScopedProseSection[];
}) => Promise<ProseDiffModelResponse>;

export type FilingDiffCacheKey = {
  cik: string;
  currentAccession: string;
  previousAccession: string;
};

export type FilingDiffSeverity = "low" | "medium" | "high";

export type SeverityRanking = {
  level: FilingDiffSeverity;
  score: number;
  reasons: string[];
};

export type FilingDiffOutput = {
  cik: string;
  currentAccession: string;
  previousAccession: string;
  pair: FilingPair;
  numeric: NumericDiffResult;
  structural: StructuralDiffResult;
  prose: ProseDiffResult;
  severity: SeverityRanking;
  cacheHit: boolean;
  actionsTaken: FilingDiffAction[];
};

export type FilingDiffState = {
  cik: string;
  accessionNumber: string;
  filings: FilingRef[];
  iteration: number;
  completed: boolean;
  pair: FilingPair | null;
  numeric: NumericDiffResult | null;
  structural: StructuralDiffResult | null;
  cacheHit: boolean;
  prose: ProseDiffResult | null;
  severity: SeverityRanking | null;
  actionsTaken: FilingDiffAction[];
  errors: string[];
};

export type FilingDiffCache = {
  read(key: FilingDiffCacheKey): Promise<ProseDiffResult | null>;
  write(key: FilingDiffCacheKey, value: ProseDiffResult): Promise<void>;
};

export type FilingDiffRouterInput = {
  cik: string;
  accessionNumber: string;
  filings: FilingRef[];
  metricsByAccession: Record<string, NumericMetricMap | undefined>;
  proseByAccession: Record<string, ProseSections | undefined>;
  riskTagsByAccession?: Record<string, string[] | undefined>;
  cache?: FilingDiffCache;
  aiDiff?: ProseDiffModel;
  maxIterations?: number;
  proseSectionCharLimit?: number;
};
