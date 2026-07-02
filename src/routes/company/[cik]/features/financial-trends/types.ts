import type { ChartBundle, ContractValidation, SeriesAnomaly } from "@/lib/analysis";

export type FinancialTrendsSeriesSummary = {
  concept: string;
  label: string;
  status: "reported" | "not_reported";
  annualCount: number;
  quarterlyCount: number;
  gapCount: number;
};

export type FinancialTrendsPayload = {
  cik: string;
  entityName: string;
  chart: ChartBundle;
  anomalies: SeriesAnomaly[];
  notReported: Array<{ metric: string; status: "not_reported" }>;
  contract: ContractValidation;
  seriesSummary: FinancialTrendsSeriesSummary[];
};

export type FinancialTrendsPanelProps = {
  data: FinancialTrendsPayload;
};
