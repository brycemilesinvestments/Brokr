import type { ProseSections } from "@/lib/edgar/discovery";
import { emptyProseSections } from "@/lib/edgar/discovery";
import { checkDiffCache } from "@/lib/filing-diff/check_diff_cache";
import { computeNumericDiff } from "@/lib/filing-diff/numeric_diff";
import { pairFilings } from "@/lib/filing-diff/pair_filings";
import { diffProse } from "@/lib/filing-diff/prose_diff";
import { rankSeverity } from "@/lib/filing-diff/rank_severity";
import {
  buildStructuralSnapshot,
  computeStructuralDiff,
} from "@/lib/filing-diff/structural_diff";
import type {
  FilingDiffAction,
  FilingDiffOutput,
  FilingDiffRouterInput,
  FilingDiffState,
  ProseDiffResult,
} from "@/lib/filing-diff/types";
import { writeDiffCache } from "@/lib/filing-diff/write_cache";

function emptyProseSectionsForDiff(): ProseSections {
  return emptyProseSections();
}

const DEFAULT_NO_CHANGE_PROSE: ProseDiffResult = {
  changed: false,
  sections: [],
  refusal: false,
  costUsd: 0,
};

/** Router policy for filing diff workflow. */
export function routeFilingDiffAction(state: FilingDiffState): FilingDiffAction {
  if (state.completed) return "complete";
  if (state.pair === null) return "pair_filings";
  if (state.numeric === null) return "numeric_diff";
  if (state.structural === null) return "structural_diff";
  if (!state.actionsTaken.includes("check_diff_cache")) return "check_diff_cache";
  if (state.prose === null && !state.cacheHit) return "prose_diff";
  if (!state.cacheHit && !state.actionsTaken.includes("write_cache") && state.prose !== null) {
    return "write_cache";
  }
  if (state.severity === null) return "rank_severity";
  return "complete";
}

function initialState(input: FilingDiffRouterInput): FilingDiffState {
  return {
    cik: input.cik,
    accessionNumber: input.accessionNumber,
    filings: input.filings,
    iteration: 0,
    completed: false,
    pair: null,
    numeric: null,
    structural: null,
    cacheHit: false,
    prose: null,
    severity: null,
    actionsTaken: [],
    errors: [],
  };
}

/** End-to-end filing diff workflow (F1→F7) with cache-before-AI behavior. */
export async function runFilingDiffRouter(input: FilingDiffRouterInput): Promise<FilingDiffOutput> {
  const maxIterations = input.maxIterations ?? 12;
  const metricsByAccession = input.metricsByAccession;
  const proseByAccession = input.proseByAccession;

  async function advance(state: FilingDiffState): Promise<FilingDiffState> {
    if (state.completed || state.iteration >= maxIterations) {
      return state;
    }

    const action = routeFilingDiffAction(state);
    state.actionsTaken.push(action);
    state.iteration += 1;

    switch (action) {
      case "pair_filings": {
        state.pair = pairFilings(state.cik, state.filings, state.accessionNumber);
        if (state.pair === null) {
          state.errors.push("Unable to pair filing with comparison baseline");
          state.completed = true;
        }
        break;
      }

      case "numeric_diff": {
        const pair = state.pair;
        if (!pair) break;
        const currentMetrics = metricsByAccession[pair.current.accessionNumber] ?? {};
        const previousMetrics = metricsByAccession[pair.previous.accessionNumber] ?? {};
        state.numeric = computeNumericDiff(currentMetrics, previousMetrics);
        break;
      }

      case "structural_diff": {
        const pair = state.pair;
        if (!pair) break;
        const currentProse =
          proseByAccession[pair.current.accessionNumber] ?? emptyProseSectionsForDiff();
        const previousProse =
          proseByAccession[pair.previous.accessionNumber] ?? emptyProseSectionsForDiff();
        state.structural = computeStructuralDiff(
          buildStructuralSnapshot({
            proseSections: currentProse,
            riskTags: input.riskTagsByAccession?.[pair.current.accessionNumber],
          }),
          buildStructuralSnapshot({
            proseSections: previousProse,
            riskTags: input.riskTagsByAccession?.[pair.previous.accessionNumber],
          }),
        );
        break;
      }

      case "check_diff_cache": {
        const pair = state.pair;
        if (!pair) break;
        const cache = await checkDiffCache(input.cache, {
          cik: state.cik,
          currentAccession: pair.current.accessionNumber,
          previousAccession: pair.previous.accessionNumber,
        });
        state.cacheHit = cache.hit;
        state.prose = cache.prose;
        break;
      }

      case "prose_diff": {
        const pair = state.pair;
        if (!pair) break;
        const currentProse =
          proseByAccession[pair.current.accessionNumber] ?? emptyProseSectionsForDiff();
        const previousProse =
          proseByAccession[pair.previous.accessionNumber] ?? emptyProseSectionsForDiff();
        if (!input.aiDiff) {
          state.prose = { ...DEFAULT_NO_CHANGE_PROSE, refusal: true };
          break;
        }
        state.prose = await diffProse({
          current: currentProse,
          previous: previousProse,
          aiModel: input.aiDiff,
          proseSectionCharLimit: input.proseSectionCharLimit,
        });
        break;
      }

      case "write_cache": {
        const pair = state.pair;
        if (!pair || !state.prose) break;
        await writeDiffCache(
          input.cache,
          {
            cik: state.cik,
            currentAccession: pair.current.accessionNumber,
            previousAccession: pair.previous.accessionNumber,
          },
          state.prose,
        );
        break;
      }

      case "rank_severity": {
        if (!state.numeric || !state.structural || !state.prose) break;
        state.severity = rankSeverity({
          numeric: state.numeric,
          structural: state.structural,
          prose: state.prose,
        });
        break;
      }

      case "complete":
      default:
        state.completed = true;
        break;
    }

    return advance(state);
  }

  const state = await advance(initialState(input));

  if (!state.pair || !state.numeric || !state.structural || !state.prose || !state.severity) {
    throw new Error(
      `Filing diff router terminated without complete output: ${state.errors.join("; ") || "unknown error"}`,
    );
  }

  return {
    cik: state.cik,
    currentAccession: state.pair.current.accessionNumber,
    previousAccession: state.pair.previous.accessionNumber,
    pair: state.pair,
    numeric: state.numeric,
    structural: state.structural,
    prose: state.prose,
    severity: state.severity,
    cacheHit: state.cacheHit,
    actionsTaken: state.actionsTaken,
  };
}
