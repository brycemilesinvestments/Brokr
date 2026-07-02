import type { ChartBundle, ChartPoint } from "@/lib/analysis";
import type { SeriesFrequency } from "@/lib/edgar/time-series";

export type { ChartBundle, ChartPoint };

/** How a peer was selected. */
export type PeerSelectionMethod = "sic" | "manual";

/** A single resolved peer company. */
export type PeerEntry = {
  cik: string;
  entityName: string;
  selectionMethod: PeerSelectionMethod;
  /** SIC code if selection was SIC-based. */
  sic?: string;
};

/** Result of peer resolution. */
export type PeerSet = {
  targetCik: string;
  targetEntityName: string;
  /** SIC code used for peer resolution (if any). */
  sic?: string;
  peers: PeerEntry[];
  status: "ok" | "insufficient_peers";
};

/**
 * Calendar alignment key — identifies a comparable period across companies
 * with different fiscal year ends.
 *   Annual:    "2025"        (calendar year of period end)
 *   Quarterly: "2025-Q2"    (calendar Q derived from period end month)
 */
export type CalendarKey = string;

/** One peer's value within a calendar-aligned period. */
export type PeerPeriodPoint = {
  cik: string;
  entityName: string;
  value: number;
  /** The peer's actual period end date (may differ from target's). */
  periodEnd: string;
};

/** Aggregated peer band statistics for one calendar period. */
export type PeerBandPoint = {
  calendarKey: CalendarKey;
  /** Representative date for chart x-axis (target's periodEnd for this bucket). */
  periodEnd: string;
  frequency: SeriesFrequency;
  /** Number of peers with data for this period (may be < total peers — P6). */
  peerCount: number;
  /** Null when peerCount is 0 — never fall back to the target value. */
  min: number | null;
  median: number | null;
  max: number | null;
  /** Individual peer values (for audit / hover detail). */
  peers: PeerPeriodPoint[];
};

/** Target's value for a calendar-aligned period. */
export type TargetPeriodPoint = {
  calendarKey: CalendarKey;
  periodEnd: string;
  value: number;
  frequency: SeriesFrequency;
};

/** Percentile rank of the target vs peers for one period. */
export type PercentilePoint = {
  calendarKey: CalendarKey;
  /** 0–100, where 50 means the target equals the peer median. Null when n=0. */
  rank: number | null;
};

/** Full peer-relative series for one metric key. */
export type RelativeMetricSeries = {
  metricKey: string;
  target: TargetPeriodPoint[];
  peerBand: PeerBandPoint[];
  percentileRank: PercentilePoint[];
};

/** Direction of a metric trend. */
export type Trend = "up" | "down" | "flat";

/** A detected divergence between target and peer-median trends. */
export type DivergenceFlag = {
  metricKey: string;
  /** Calendar period where divergence is detected. */
  calendarKey: CalendarKey;
  /** Representative date for display. */
  periodEnd: string;
  targetTrend: Trend;
  peerMedianTrend: Trend;
  description: string;
};

/**
 * Extracted per-peer metric data: combined chart points from both the
 * time-series bundle (ratio series) and extended metrics bundle (derived).
 */
export type PeerExtraction = {
  peerEntry: PeerEntry;
  entityName: string;
  /** Combined chart: { ...timeSeriesChart, ...extendedChart } */
  chart: ChartBundle;
};

/** Full peer comparison result (P7 chart-ready). */
export type PeerComparisonBundle = {
  targetCik: string;
  targetEntityName: string;
  peerSet: PeerSet;
  relativeMetrics: RelativeMetricSeries[];
  divergences: DivergenceFlag[];
  /**
   * Chart keys per metric:
   *   {metricKey}              — target line (ChartPoint[])
   *   peer_band:{metricKey}    — peer median band
   *   peer_min:{metricKey}     — peer minimum band
   *   peer_max:{metricKey}     — peer maximum band
   */
  chart: ChartBundle;
};

/** Dependencies for peer resolution (injected for testability). */
export type PeerResolveDeps = {
  /** Fetch the SIC code for a CIK from the SEC submissions API. */
  fetchSic: (cik: string) => Promise<string | null>;
  /** Fetch companies sharing a SIC code. */
  fetchCompaniesBySic: (sic: string) => Promise<Array<{ cik: string; entityName: string }>>;
  /** Most recent SEC filing date for a CIK (used to filter inactive SIC matches). */
  fetchLastFilingDate: (cik: string) => Promise<string | null>;
};

/** Dependencies for peer metric extraction. */
export type PeerExtractDeps = {
  /** Fetch raw company facts for a CIK (same signature as EdgarClient.getCompanyFacts). */
  getCompanyFacts: (cik: string) => Promise<import("@/lib/edgar").CompanyFactsResponse>;
};
