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
