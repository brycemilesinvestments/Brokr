import type { AiClient } from "@/lib/ai";
import type { FilingRef, XbrlFact } from "@/lib/edgar";

export type GuidanceMetric =
  | "revenue"
  | "eps"
  | "ebitda"
  | "operating_income"
  | "gross_margin"
  | "net_income"
  | "cash_flow"
  | "capex"
  | "other";

export type Earnings8kAuditEntry = {
  accessionNumber: string;
  filingDate: string;
  form: string;
  primaryDocument?: string;
  accepted: boolean;
  score: number;
  reasons: string[];
  rejectionReason?: string;
};

export type Earnings8kCandidate = {
  cik: string;
  accessionNumber: string;
  filingDate: string;
  reportDate?: string;
  form: string;
  primaryDocument?: string;
  score: number;
  reasons: string[];
};

export type TaggedNumber = {
  accessionNumber: string;
  concept: string;
  taxonomy: string;
  metric: GuidanceMetric;
  value: number;
  periodEnd?: string;
  unit?: string;
};

export type GuidanceRange = {
  metric: GuidanceMetric;
  low?: number;
  high?: number;
  unit?: string;
  note?: string;
};

export type GuidanceExtraction = {
  found: boolean;
  hasGuidance: boolean;
  summary?: string;
  ranges: GuidanceRange[];
  rawResponseText?: string;
};

export type GuidanceCacheRecord = {
  cik: string;
  accessionNumber: string;
  extractedAt: string;
  guidance: GuidanceExtraction;
};

export type GuidanceCache = {
  read(cik: string, accessionNumber: string): Promise<GuidanceCacheRecord | null>;
  write(cik: string, accessionNumber: string, record: GuidanceCacheRecord): Promise<void>;
};

export type GuidanceAiInput = {
  cik: string;
  filing: FilingRef;
  taggedNumbers: TaggedNumber[];
};

export type GuidanceAiResult = {
  guidance: GuidanceExtraction;
  costUsd: number;
};

export type GuidanceAiExtractor = (input: GuidanceAiInput) => Promise<GuidanceAiResult>;

export type CheckCacheResult = {
  cacheHit: boolean;
  record: GuidanceCacheRecord | null;
};

export type GuidanceVsActual = {
  metric: GuidanceMetric;
  guidanceLow?: number;
  guidanceHigh?: number;
  actual?: number;
  unit?: string;
  inRange: boolean | null;
  varianceToMidpoint?: number;
};

export type GuidanceRouterAction =
  | "find_earnings_8k"
  | "extract_tagged_numbers"
  | "check_cache"
  | "extract_guidance"
  | "write_cache"
  | "track_vs_actual"
  | "complete";

export type GuidanceRouterState = {
  cik: string;
  iteration: number;
  completed: boolean;
  costUsd: number;
  filings: FilingRef[];
  ixbrlFactsByAccession: Record<string, XbrlFact[]>;
  candidates: Earnings8kCandidate[] | null;
  earnings8kAudit: Earnings8kAuditEntry[] | null;
  taggedNumbersByAccession: Record<string, TaggedNumber[]> | null;
  cacheByAccession: Record<string, GuidanceCacheRecord | null> | null;
  extractedByAccession: Record<string, GuidanceExtraction> | null;
  comparisonsByAccession: Record<string, GuidanceVsActual[]> | null;
  actionsTaken: GuidanceRouterAction[];
  errors: string[];
};

export type GuidanceRouterInput = {
  cik: string;
  filings: FilingRef[];
  ixbrlFactsByAccession?: Record<string, XbrlFact[]>;
  cache: GuidanceCache;
  aiClient?: AiClient;
  aiExtractor?: GuidanceAiExtractor;
  maxIterations?: number;
};

export type GuidanceRouterOutput = {
  cik: string;
  candidates: Earnings8kCandidate[];
  earnings8kAudit: Earnings8kAuditEntry[];
  taggedNumbersByAccession: Record<string, TaggedNumber[]>;
  guidanceByAccession: Record<string, GuidanceExtraction>;
  comparisonsByAccession: Record<string, GuidanceVsActual[]>;
  cacheHits: string[];
  iterations: number;
  costUsd: number;
  completed: boolean;
  terminatedReason: "complete" | "max_iterations";
  errors: string[];
};
