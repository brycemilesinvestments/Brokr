export type SeriesFrequency = "annual" | "quarterly";

export type RawTimeSeriesPoint = {
  periodEnd: string;
  value: number;
  fy?: number;
  fp?: string;
  filed: string;
  form: string;
  accn: string;
  unit: string;
  start?: string;
  /** K3 — true for 10-K sourced points, false for 10-Q. */
  audited?: boolean;
};

export type PeriodGap = {
  expectedFy: number;
  expectedFp: string;
  afterPeriodEnd: string;
  beforePeriodEnd: string;
};

export type MetricSeriesPoint = RawTimeSeriesPoint & {
  deltaQoq?: number;
  deltaYoy?: number;
};

export type MetricSeries = {
  concept: string;
  status: "reported" | "not_reported";
  unit?: string;
  annual: MetricSeriesPoint[];
  quarterly: MetricSeriesPoint[];
  gaps: PeriodGap[];
};

export type MetricSeriesBundle = {
  cik: string;
  entityName: string;
  series: Record<string, MetricSeries>;
};
