import type { ChartBundle, NotReportedMetric } from "@/lib/analysis";
import type { SeriesFrequency } from "@/lib/edgar/time-series";

/** Keys for metrics derived from Chunk 3 series (C7.1–C7.3). */
export type DerivedMetricKey =
  | "free_cash_flow"
  | "fcf_margin"
  | "capex_intensity"
  | "dso"
  | "dio"
  | "dpo"
  | "cash_conversion_cycle"
  | "sbc_pct_revenue"
  | "share_count_trend"
  | "net_issuance";

/** Chunk 7 extended concepts beyond Chunk 3 whitelist. */
export type ExtendedConceptKey =
  | "PaymentsToAcquirePropertyPlantAndEquipment"
  | "ShareBasedCompensation"
  | "RevenueRemainingPerformanceObligation"
  | "AccountsReceivableNetCurrent"
  | "InventoryNet"
  | "AccountsPayableCurrent";

export type DerivedMetricPoint = {
  periodEnd: string;
  frequency: SeriesFrequency;
  value?: number;
  fy?: number;
  fp?: string;
  /** Explicit reason when value is undefined (C7.7). */
  skipReason?: string;
};

export type DerivedMetricSeries = {
  key: DerivedMetricKey;
  status: "reported" | "not_reported";
  unit?: string;
  annual: DerivedMetricPoint[];
  quarterly: DerivedMetricPoint[];
};

export type MissingMetricReason = {
  metric: DerivedMetricKey | ExtendedConceptKey | string;
  periodEnd: string;
  frequency: SeriesFrequency;
  reason: string;
  missingConcept?: string;
};

/** C7.1 — FCF, margin, and capex intensity aligned to operating CF periods. */
export type CashFlowQuality = {
  freeCashFlow: DerivedMetricSeries;
  fcfMargin: DerivedMetricSeries;
  capexIntensity: DerivedMetricSeries;
};

/** C7.2 — DSO, DIO, DPO, CCC with zero-division guards. */
export type WorkingCapital = {
  dso: DerivedMetricSeries;
  dio: DerivedMetricSeries;
  dpo: DerivedMetricSeries;
  cashConversionCycle: DerivedMetricSeries;
};

/** C7.3 — SBC %, share count trend, net issuance. */
export type DilutionMetrics = {
  sbcPctRevenue: DerivedMetricSeries;
  shareCountTrend: DerivedMetricSeries;
  netIssuance: DerivedMetricSeries;
};

export type SegmentDimension = "end_market" | "geography";

export type SegmentSeriesPoint = {
  periodEnd: string;
  frequency: SeriesFrequency;
  value: number;
  fy?: number;
  fp?: string;
};

/** C7.4 — Disaggregated revenue by end-market or geography. */
export type SegmentSeries = {
  segmentName: string;
  dimension: SegmentDimension;
  status: "reported" | "not_reported";
  unit?: string;
  annual: SegmentSeriesPoint[];
  quarterly: SegmentSeriesPoint[];
};

export type SegmentBreakout = {
  endMarket: SegmentSeries[];
  geography: SegmentSeries[];
};

/** C7.5 — RPO / backlog with explicit not_reported status. */
export type BacklogSeries = {
  concept: "RevenueRemainingPerformanceObligation";
  status: "reported" | "not_reported";
  unit?: string;
  annual: DerivedMetricPoint[];
  quarterly: DerivedMetricPoint[];
};

/** Full Chunk 7 output bundle (C7.6 chart-ready). */
export type ExtendedMetricsBundle = {
  cik: string;
  entityName: string;
  cashFlowQuality: CashFlowQuality;
  workingCapital: WorkingCapital;
  dilution: DilutionMetrics;
  segments: SegmentBreakout;
  backlog: BacklogSeries;
  missing: MissingMetricReason[];
  notReported: NotReportedMetric[];
  chart: ChartBundle;
};

export type ExtendedMetricsState = {
  cik: string;
  bundle: ExtendedMetricsBundle | null;
};
