import type { EdgarFinancials } from "@/lib/edgar";

export type Financials = {
  cik: string;
  entityName: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  stockholdersEquity?: number;
  sharesOutstanding?: number;
  fiscalYear?: number;
  fiscalPeriod?: string;
  asOfDate?: string;
  priorRevenue?: number;
  priorGrossProfit?: number;
};

export type Ratios = {
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  debtToEquity?: number;
  returnOnEquity?: number;
  currentRatio?: number;
};

export type Delta = {
  metric: string;
  current?: number;
  prior?: number;
  absoluteChange?: number;
  ratioChange?: number;
};

export type AnomalySeverity = "low" | "medium" | "high";

export type Anomaly = {
  metric: string;
  severity: AnomalySeverity;
  message: string;
  value?: number;
  threshold?: number;
};

export type AnalysisResult = {
  financials: Financials;
  ratios: Ratios;
  deltas: Delta[];
  anomalies: Anomaly[];
};

export function fromEdgarFinancials(raw: EdgarFinancials): Financials {
  return { ...raw };
}
