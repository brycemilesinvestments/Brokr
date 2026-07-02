import type { AnalysisResult } from "@/lib/analysis/types";
import type { ExplainResponse } from "@/lib/ai/types";

export type QuarterlyAnalysisInput = {
  cik: string;
  ticker?: string;
  fiscalYear: number;
  fiscalPeriod: string;
};

export type QuarterlyAnalysisOutput = {
  input: QuarterlyAnalysisInput;
  analysis: AnalysisResult;
  explanation?: ExplainResponse;
  completedAt: string;
};

export function buildQuarterlyContract(
  input: QuarterlyAnalysisInput,
  analysis: AnalysisResult,
  explanation?: ExplainResponse,
  completedAt?: string,
): QuarterlyAnalysisOutput {
  return {
    input,
    analysis,
    explanation,
    completedAt: completedAt ?? new Date().toISOString(),
  };
}

export function isQuarterlyComplete(output: Partial<QuarterlyAnalysisOutput>): boolean {
  return Boolean(output.analysis?.financials?.cik && output.completedAt);
}
