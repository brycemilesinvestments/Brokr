import type { ProseSections } from "@/lib/edgar/discovery";
import type { FilingPair, NumericDiffResult, ProseDiffResult, StructuralDiffResult } from "@/lib/filing-diff/types";
import type { FilingRef } from "@/lib/edgar/types";

export type Form10kAction =
  | "ingest_sections"
  | "extract_xbrl_universe"
  | "tag_audit_status"
  | "pair_annual_filings"
  | "numeric_diff"
  | "structural_diff"
  | "check_prose_cache"
  | "prose_diff"
  | "store_credibility"
  | "cross_ref_8k_events"
  | "detect_auditor_change"
  | "confirm_pgvector_schema"
  | "complete";

export type XbrlUniverseReport = {
  ixbrlFactCount: number;
  companyfactsConceptCount: number;
  ixbrlExceedsCompanyfacts: boolean;
  customNamespaceFacts: number;
  coverageByTaxonomy: Record<string, number>;
};

export type AuditorChangeResult = {
  currentAuditor: string | null;
  previousAuditor: string | null;
  changed: boolean;
  materialEvent: boolean;
};

export type ManagementCredibilityRecord = {
  fiscalYear: number;
  periodEnd: string;
  accession: string;
  mdaOutlookText: string | null;
  riskFactorSummary: string | null;
  storedAt: string;
};

export type EightKCrossRef = {
  eventAccession: string;
  eventType: string;
  eventDate: string;
  linkedSection: string | null;
  linked: boolean;
};

export type EightKCrossRefResult = {
  linked: EightKCrossRef[];
  unlinked: EightKCrossRef[];
};

export type Form10kState = {
  cik: string;
  accessionNumber: string;
  form: string;
  filings: FilingRef[];
  iteration: number;
  completed: boolean;
  actionsTaken: Form10kAction[];
  errors: string[];
  sections: ProseSections | null;
  xbrlUniverse: XbrlUniverseReport | null;
  audited: boolean | null;
  pair: FilingPair | null;
  numeric: NumericDiffResult | null;
  structural: StructuralDiffResult | null;
  cacheHit: boolean;
  prose: ProseDiffResult | null;
  credibility: ManagementCredibilityRecord | null;
  eightKCrossRef: EightKCrossRefResult | null;
  auditorChange: AuditorChangeResult | null;
  pgvectorReady: boolean;
  costUsd: number;
};

export type Form10kOutput = {
  cik: string;
  accessionNumber: string;
  form: string;
  sections: ProseSections;
  xbrlUniverse: XbrlUniverseReport;
  audited: boolean;
  pair: FilingPair | null;
  numeric: NumericDiffResult | null;
  structural: StructuralDiffResult | null;
  prose: ProseDiffResult | null;
  credibility: ManagementCredibilityRecord | null;
  eightKCrossRef: EightKCrossRefResult | null;
  auditorChange: AuditorChangeResult | null;
  pgvectorReady: boolean;
  cacheHit: boolean;
  costUsd: number;
  actionsTaken: Form10kAction[];
};
