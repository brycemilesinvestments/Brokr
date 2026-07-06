import type { AiClient } from "@/lib/ai";
import { extractProseSignals } from "@/lib/ai/qualitative-signals";
import type { CompanyFactsResponse, XbrlFact } from "@/lib/edgar";
import {
  classifyConcepts,
  computeCoverageDelta,
  enumerateConcepts,
  locateProseSections,
} from "@/lib/edgar/discovery";
import { crossCheckSignals } from "@/lib/orchestrate/filing-discovery/cross-check";
import { extractForwardNumbers } from "@/lib/orchestrate/filing-discovery/extract-forward-numbers";
import {
  routeFilingDiscoveryAction,
  type FilingDiscoveryAction,
  type FilingDiscoveryState,
} from "@/lib/orchestrate/filing-discovery/router";
import type { SignalCache } from "@/lib/orchestrate/filing-discovery/signal-cache";
import type {
  FilingDiscoveryOutput,
  FilingDiscoveryConfig,
} from "@/lib/orchestrate/filing-discovery/types";

const DEFAULT_FILING_MAX_ITERATIONS = 10;
const DEFAULT_FILING_MAX_COST_USD = 0.1;

function parseFilingDiscoveryConfig(
  env: Record<string, string | undefined> = process.env,
): FilingDiscoveryConfig {
  return {
    maxIterations: Number(env.MAX_ITERATIONS ?? DEFAULT_FILING_MAX_ITERATIONS),
    maxCostUsd: Number(env.MAX_COST_USD ?? DEFAULT_FILING_MAX_COST_USD),
  };
}

function createInitialState(
  cik: string,
  accessionNumber: string,
): FilingDiscoveryState {
  return {
    cik,
    accessionNumber,
    iteration: 0,
    costUsd: 0,
    completed: false,
    universe: null,
    coverage: null,
    classifications: null,
    forwardSignals: null,
    proseSections: null,
    qualitativeSignals: null,
    cacheHit: false,
    crossCheckResults: null,
    actionsTaken: [],
    errors: [],
  };
}

type RunInput = {
  cik: string;
  accessionNumber: string;
  companyFacts: CompanyFactsResponse;
  ixbrlFacts: XbrlFact[];
  cache: SignalCache;
  ai?: AiClient;
  config?: FilingDiscoveryConfig;
};

function applyDeterministicAction(
  action: FilingDiscoveryAction,
  state: FilingDiscoveryState,
  input: RunInput,
): FilingDiscoveryState {
  switch (action) {
    case "enumerate_concepts":
      return { ...state, universe: enumerateConcepts(input.companyFacts) };
    case "compute_coverage_delta":
      return { ...state, coverage: computeCoverageDelta(state.universe!) };
    case "classify_concepts":
      return { ...state, classifications: classifyConcepts(state.universe!) };
    case "extract_forward_numbers":
      return {
        ...state,
        forwardSignals: extractForwardNumbers(input.companyFacts, input.ixbrlFacts),
      };
    case "locate_prose_sections":
      return { ...state, proseSections: locateProseSections(input.ixbrlFacts) };
    default:
      return state;
  }
}

export async function analyzeFilingDiscovery(input: RunInput): Promise<FilingDiscoveryOutput> {
  const config = input.config ?? parseFilingDiscoveryConfig();
  let state = createInitialState(input.cik, input.accessionNumber);
  let terminatedReason: FilingDiscoveryOutput["terminatedReason"] = "complete";

  while (state.iteration < config.maxIterations) {
    const action = routeFilingDiscoveryAction(state);
    if (action === "complete") {
      state = { ...state, completed: true };
      break;
    }

    if (action === "check_signal_cache") {
      const cached = await input.cache.read(input.cik, input.accessionNumber);
      state = {
        ...state,
        cacheHit: cached !== null,
        qualitativeSignals: cached ?? state.qualitativeSignals,
        actionsTaken: [...state.actionsTaken, action],
        iteration: state.iteration + 1,
      };
      if (cached) {
        continue;
      }
      continue;
    }

    if (action === "extract_prose_signals") {
      if (state.costUsd >= config.maxCostUsd) {
        state = {
          ...state,
          qualitativeSignals: "skipped_budget",
          actionsTaken: [...state.actionsTaken, action],
          iteration: state.iteration + 1,
        };
        continue;
      }

      if (!input.ai) {
        state = {
          ...state,
          qualitativeSignals: "skipped_budget",
          errors: [...state.errors, "No AI client configured"],
          actionsTaken: [...state.actionsTaken, action],
          iteration: state.iteration + 1,
        };
        continue;
      }

      try {
        const result = await extractProseSignals(
          input.ai,
          input.accessionNumber,
          state.proseSections!,
        );
        state = {
          ...state,
          qualitativeSignals: result.signals,
          costUsd: state.costUsd + result.costUsd,
          actionsTaken: [...state.actionsTaken, action],
          iteration: state.iteration + 1,
        };
      } catch (err) {
        state = {
          ...state,
          qualitativeSignals: "skipped_budget",
          errors: [
            ...state.errors,
            `AI extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          ],
          actionsTaken: [...state.actionsTaken, action],
          iteration: state.iteration + 1,
        };
      }
      continue;
    }

    if (action === "write_cache") {
      if (
        state.qualitativeSignals &&
        state.qualitativeSignals !== "skipped_budget"
      ) {
        await input.cache.write(input.cik, input.accessionNumber, state.qualitativeSignals);
      }
      state = {
        ...state,
        actionsTaken: [...state.actionsTaken, action],
        iteration: state.iteration + 1,
      };
      continue;
    }

    if (action === "cross_check") {
      const crossCheckResults =
        state.qualitativeSignals && state.qualitativeSignals !== "skipped_budget"
          ? crossCheckSignals(state.forwardSignals!, state.qualitativeSignals)
          : [];
      state = {
        ...state,
        crossCheckResults,
        actionsTaken: [...state.actionsTaken, action],
        iteration: state.iteration + 1,
      };
      continue;
    }

    state = {
      ...applyDeterministicAction(action, state, input),
      actionsTaken: [...state.actionsTaken, action],
      iteration: state.iteration + 1,
    };
  }

  if (!state.completed && state.iteration >= config.maxIterations) {
    terminatedReason = "max_iterations";
  }
  if (state.costUsd >= config.maxCostUsd && state.qualitativeSignals === "skipped_budget") {
    terminatedReason = "budget_exceeded";
  }

  return {
    cik: state.cik,
    accessionNumber: state.accessionNumber,
    universe: state.universe ?? [],
    coverage: state.coverage!,
    classifications: state.classifications ?? [],
    forwardSignals: state.forwardSignals!,
    proseSections: state.proseSections!,
    qualitativeSignals: state.qualitativeSignals,
    crossCheckResults: state.crossCheckResults ?? [],
    cacheHit: state.cacheHit,
    completed: state.completed || terminatedReason === "complete",
    terminatedReason,
    iterations: state.iteration,
    costUsd: state.costUsd,
    errors: state.errors,
  };
}
