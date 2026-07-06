import type { CompanyFactsResponse } from "@/lib/edgar/types";
import type { MetricSeriesBundle, MetricSeriesPoint, SeriesFrequency } from "@/lib/edgar/time-series";

export type RatioSeriesKey =
  | "gross_margin"
  | "operating_margin"
  | "net_margin"
  | "current_ratio"
  | "debt_to_equity"
  | "return_on_equity";

export type SeriesAnomaly = {
  periodEnd: string;
  metric: string;
  type: string;
  magnitude: number;
  frequency: SeriesFrequency;
};

export type ChartPoint = {
  x: string;
  y: number;
  frequency: SeriesFrequency;
  delta_qoq?: number;
  delta_yoy?: number;
  anomaly?: boolean;
  /** SEC accession for the filing that reported this value. */
  accessionNumber?: string;
};

export type ChartBundle = Record<string, ChartPoint[]>;

export type RatioSeriesPoint = {
  periodEnd: string;
  frequency: SeriesFrequency;
  value?: number;
  fy?: number;
  fp?: string;
};

export type TimeSeriesBundle = {
  cik: string;
  entityName: string;
  rawFacts: CompanyFactsResponse;
  metrics: MetricSeriesBundle;
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>;
  anomalies: SeriesAnomaly[];
  chart: ChartBundle;
};

export type NotReportedMetric = {
  metric: string;
  status: "not_reported";
};

export type TimeSeriesState = {
  cik: string;
  rawFacts: CompanyFactsResponse | null;
  bundle: TimeSeriesBundle | null;
  notReported: NotReportedMetric[];
};

export type ContractCheck = {
  id: string;
  passed: boolean;
  message?: string;
};

export type ContractValidation = {
  passed: boolean;
  checks: ContractCheck[];
};
