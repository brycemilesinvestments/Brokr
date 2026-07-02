import type { ProseSectionKey } from "@/lib/edgar/discovery";

export type OutlookSignal = {
  found: boolean;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative" | "mixed";
  stated_drivers?: string[];
  stated_risks?: string[];
};

export type CustomerSignal = {
  found: boolean;
  concentration_pct?: number;
  named_customers?: string[];
  new_vs_existing_language?: string;
};

export type GuidanceRange = {
  metric: string;
  low?: number;
  high?: number;
  unit?: string;
};

export type GuidanceSignal = {
  found: boolean;
  has_guidance?: boolean;
  metrics_guided?: string[];
  ranges?: GuidanceRange[];
};

export type SectionQualitativeSignal = {
  section: ProseSectionKey;
  outlook?: OutlookSignal;
  customers?: CustomerSignal;
  guidance?: GuidanceSignal;
};

export type QualitativeSignals = {
  accessionNumber: string;
  extractedAt: string;
  sections: SectionQualitativeSignal[];
  skipped?: boolean;
  skipReason?: string;
};

export type QualitativeSignalsResult = QualitativeSignals | "skipped_budget";

export const CONCENTRATION_TOLERANCE_PCT = 2;
