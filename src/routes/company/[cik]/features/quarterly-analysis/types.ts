import type { CompanyAnalysisOutput } from "@/lib/orchestrate";

export type CompanyAnalysisResponse = CompanyAnalysisOutput;

export type CompanyAnalysisPanelProps = {
  cik: string;
  ticker?: string;
};

/** @deprecated Use CompanyAnalysisPanelProps */
export type QuarterlyAnalysisPanelProps = CompanyAnalysisPanelProps;

/** @deprecated Use CompanyAnalysisResponse */
export type QuarterlyAnalysisResponse = CompanyAnalysisResponse;
