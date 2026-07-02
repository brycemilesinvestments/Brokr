import type { ContractValidation, TimeSeriesBundle } from "@/lib/analysis";
import type { ExplainResponse } from "@/lib/ai";
import type { EventStudyResult } from "@/lib/insider";
import type { ExtendedMetricsBundle } from "@/lib/metrics";
import type { ValuationBundle } from "@/lib/valuation";

/** C10.5 — Anomaly flagged across one or more analysis layers, chart-markable. */
export type CrossLayerAnomaly = {
  id: string;
  layers: Array<"fundamentals" | "valuation" | "insider" | "cross_layer">;
  type: string;
  date: string;
  periodEnd?: string;
  chartKeys: string[];
  magnitude: number;
  description: string;
};

/** C10.6 — AI explanation tied to a single flagged anomaly with period excerpt. */
export type AnomalyExplanation = {
  anomalyId: string;
  excerpt: string;
  explanation: ExplainResponse;
};

export type PeriodRange = {
  earliest: string;
  latest: string;
  pointCount: number;
};

export type SegmentCoverage = {
  endMarketSegments: number;
  geographySegments: number;
  endMarketWithData: number;
  geographyWithData: number;
};

/** C10.7 — Coverage summary surfaced to the UI. */
export type CoverageReport = {
  cik: string;
  entityName: string;
  metricsReported: number;
  metricsTotal: number;
  quarterlyRange?: PeriodRange;
  annualRange?: PeriodRange;
  segments: SegmentCoverage;
  insiderSignalEventCount: number;
  insiderStatus: EventStudyResult["status"];
  valuationAvailable: boolean;
  warnings: string[];
};

export type MasterContractCheck = {
  id: string;
  passed: boolean;
  message?: string;
};

export type MasterContractValidation = {
  passed: boolean;
  checks: MasterContractCheck[];
  timeSeriesValidation?: ContractValidation;
};

export type AnalyzeCompanyInput = {
  cik: string;
  ticker?: string;
};

export type CompanyAnalysisOutput = {
  cik: string;
  ticker?: string;
  timeSeries: TimeSeriesBundle;
  metrics: ExtendedMetricsBundle;
  valuation?: ValuationBundle;
  insider: EventStudyResult;
  crossAnomalies: CrossLayerAnomaly[];
  anomalyExplanations: AnomalyExplanation[];
  coverage: CoverageReport;
  contract: MasterContractValidation;
  completed: boolean;
  terminatedReason: "complete" | "max_iterations" | "budget_exceeded" | "partial";
  unsatisfied: string[];
  iterations: number;
  costUsd: number;
};

export const DEFAULT_MASTER_MAX_ITERATIONS = 20;
export const DEFAULT_MASTER_MAX_COST_USD = 0.5;

export type MasterOrchestrationConfig = {
  maxIterations: number;
  maxCostUsd: number;
};

export function parseMasterConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): MasterOrchestrationConfig {
  return {
    maxIterations: Number(
      env.MAX_ITERATIONS ?? env.MAX_AGENT_ITERATIONS ?? DEFAULT_MASTER_MAX_ITERATIONS,
    ),
    maxCostUsd: Number(env.MAX_COST ?? env.MAX_AGENT_COST_USD ?? DEFAULT_MASTER_MAX_COST_USD),
  };
}
