import type { SeriesFrequency } from "@/lib/edgar/time-series/types";

/** D1 — A single concept discovered in companyfacts. */
export type UniverseConcept = {
  concept: string;
  taxonomy: string;
  dataPointCount: number;
  frequencies: SeriesFrequency[];
};

/** D2 — Coverage of whitelist concepts against full universe. */
export type CoverageDelta = {
  whitelistPresent: number;
  universeTotal: number;
  whitelistConcepts: string[];
  unsurfaced: Array<{
    concept: string;
    taxonomy: string;
    dataPointCount: number;
    frequencies: SeriesFrequency[];
  }>;
};

export type ConceptTag = "core" | "known_useful" | "company_specific" | "ignorable";

/** D3 — Classification tag for each universe concept. */
export type ConceptClassification = {
  concept: string;
  taxonomy: string;
  tag: ConceptTag;
};

export type SignalSeriesPoint = {
  periodEnd: string;
  value: number;
  frequency: SeriesFrequency;
  fy?: number;
  fp?: string;
};

export type ForwardSignalSeries = {
  concept: string;
  status: "reported" | "not_reported";
  unit?: string;
  annual: SignalSeriesPoint[];
  quarterly: SignalSeriesPoint[];
};

export type SegmentGrowthRate = {
  segmentName: string;
  dimension: "end_market" | "geography";
  currentPeriodEnd: string;
  priorPeriodEnd: string;
  currentValue: number;
  priorValue: number;
  growthRate: number;
};

/** D4 — Deterministic forward-looking numeric signals. */
export type ForwardSignals = {
  backlog: ForwardSignalSeries;
  customerConcentration: ForwardSignalSeries;
  segmentGrowth: SegmentGrowthRate[];
};

export type ProseSectionKey =
  | "mda"
  | "risk_factors"
  | "revenue_concentration"
  | "subsequent_events"
  | "form_8k_body"
  | "exhibit_99_1";

/** D5 — Raw prose extracted from XBRL text-block tags. */
export type ProseSection = {
  key: ProseSectionKey;
  concept: string;
  taxonomy: string;
  text: string;
  charCount: number;
};

export type ProseSections = Record<ProseSectionKey, ProseSection | null>;
