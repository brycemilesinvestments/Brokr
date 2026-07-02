import type { EdgarClient } from "@/lib/edgar";
import type { CompanyFactsResponse } from "@/lib/edgar";
import {
  buildTimeSeriesState,
  validateTimeSeriesContract,
  isTimeSeriesComplete,
  type TimeSeriesState,
  type ContractValidation,
} from "@/lib/analysis/time-series";

export type BuildTimeSeriesResult = {
  state: TimeSeriesState;
  validation: ContractValidation;
  complete: boolean;
};

export async function buildCompanyTimeSeries(
  cik: string,
  edgar: EdgarClient,
): Promise<BuildTimeSeriesResult> {
  const rawFacts = await edgar.getCompanyFacts(cik);
  return buildTimeSeriesFromFacts(rawFacts as CompanyFactsResponse);
}

export function buildTimeSeriesFromFacts(
  rawFacts: CompanyFactsResponse,
): BuildTimeSeriesResult {
  const state = buildTimeSeriesState(rawFacts);
  const validation = validateTimeSeriesContract(state);
  return {
    state,
    validation,
    complete: isTimeSeriesComplete(state),
  };
}
