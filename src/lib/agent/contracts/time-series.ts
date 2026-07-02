import type { TimeSeriesState, ContractValidation } from "@/lib/analysis/time-series";
import { buildTimeSeriesState, validateTimeSeriesContract, isTimeSeriesComplete } from "@/lib/analysis/time-series";
import type { CompanyFactsResponse } from "@/lib/edgar/types";

export type TimeSeriesAgentState = {
  cik: string;
  rawFacts: CompanyFactsResponse | null;
  timeSeries: TimeSeriesState | null;
  contract: ContractValidation | null;
  completed: boolean;
  errors: string[];
};

export function createTimeSeriesAgentState(cik: string): TimeSeriesAgentState {
  return {
    cik,
    rawFacts: null,
    timeSeries: null,
    contract: null,
    completed: false,
    errors: [],
  };
}

export function applyCompanyFacts(
  state: TimeSeriesAgentState,
  rawFacts: CompanyFactsResponse,
): TimeSeriesAgentState {
  const timeSeries = buildTimeSeriesState(rawFacts);
  const contract = validateTimeSeriesContract(timeSeries);

  return {
    ...state,
    rawFacts,
    timeSeries,
    contract,
    completed: isTimeSeriesComplete(timeSeries),
    errors: contract.passed
      ? state.errors
      : [...state.errors, ...contract.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.message}`)],
  };
}

export function guardTimeSeriesComplete(state: TimeSeriesAgentState): boolean {
  if (!state.rawFacts || !state.timeSeries) return false;
  return isTimeSeriesComplete(state.timeSeries);
}
