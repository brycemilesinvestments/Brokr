import type { CompanyAnalysisOutput } from "@/lib/orchestrate";
import type { Filing } from "@/routes/company/[cik]/types";

export type CompanyAnalysisResponse = CompanyAnalysisOutput;

export type CompanyAnalysisPanelProps = {
  cik: string;
  filings: Filing[];
  ticker?: string;
};

/** @deprecated Use CompanyAnalysisPanelProps */
export type QuarterlyAnalysisPanelProps = CompanyAnalysisPanelProps;

/** @deprecated Use CompanyAnalysisResponse */
export type QuarterlyAnalysisResponse = CompanyAnalysisResponse;
