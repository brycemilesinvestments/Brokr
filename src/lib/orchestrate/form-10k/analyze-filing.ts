import {
  routeForm10kAction,
  toForm10kOutput,
  type Form10kOutput,
  type Form10kState,
} from "@/lib/agent/form-10k";
import type { CompanyFactsResponse } from "@/lib/edgar/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import type { FilingRef } from "@/lib/edgar/types";
import { checkDiffCache } from "@/lib/filing-diff/check_diff_cache";
import { computeNumericDiff } from "@/lib/filing-diff/numeric_diff";
import { diffProse } from "@/lib/filing-diff/prose_diff";
import {
  buildStructuralSnapshot,
  computeStructuralDiff,
} from "@/lib/filing-diff/structural_diff";
import type {
  FilingDiffCache,
  NumericMetricMap,
  ProseDiffModel,
} from "@/lib/filing-diff/types";
import { writeDiffCache } from "@/lib/filing-diff/write_cache";
import { crossRef8kEvents, type Known8kEvent } from "@/lib/orchestrate/form-10k/cross-ref-8k-events";
import { detectAuditorChange } from "@/lib/orchestrate/form-10k/detect-auditor-change";
import { extractXbrlUniverse } from "@/lib/orchestrate/form-10k/extract-xbrl-universe";
import { pairAnnualFilings } from "@/lib/orchestrate/form-10k/pair-annual-filings";
import { storeManagementCredibility } from "@/lib/orchestrate/form-10k/store-credibility";
import { tagFilingAuditStatus } from "@/lib/orchestrate/form-10k/tag-audit-status";
import type { ProseSections } from "@/lib/edgar/discovery";
import type { FilingChunk } from "@/lib/rag/types";

const DEFAULT_FORM10K_MAX_ITERATIONS = 15;

export type RunForm10kAgentInput = {
  cik: string;
  accessionNumber: string;
  form: string;
  periodEnd: string;
  filings: FilingRef[];
  ixbrlFacts: XbrlFact[];
  companyFacts: CompanyFactsResponse;
  sections: ProseSections;
  chunks: FilingChunk[];
  metrics?: NumericMetricMap;
  previousMetrics?: NumericMetricMap;
  previousSections?: ProseSections;
  previousFacts?: XbrlFact[];
  known8kEvents?: Known8kEvent[];
  diffCache?: FilingDiffCache;
  aiDiff?: ProseDiffModel;
  maxIterations?: number;
};

function initialState(input: RunForm10kAgentInput): Form10kState {
  return {
    cik: input.cik,
    accessionNumber: input.accessionNumber,
    form: input.form,
    filings: input.filings,
    iteration: 0,
    completed: false,
    actionsTaken: [],
    errors: [],
    sections: input.sections,
    xbrlUniverse: null,
    audited: null,
    pair: null,
    numeric: null,
    structural: null,
    cacheHit: false,
    prose: null,
    credibility: null,
    eightKCrossRef: null,
    auditorChange: null,
    pgvectorReady: false,
    costUsd: 0,
  };
}

/** Run the 10-K completion contract router (K1–K12). */
export async function runForm10kAgent(input: RunForm10kAgentInput): Promise<Form10kOutput> {
  const maxIterations = input.maxIterations ?? DEFAULT_FORM10K_MAX_ITERATIONS;
  let storedChunks = input.chunks;

  async function advance(state: Form10kState): Promise<Form10kState> {
    if (state.completed || state.iteration >= maxIterations) {
      return state;
    }

    const action = routeForm10kAction(state);
    state.actionsTaken.push(action);
    state.iteration += 1;

    switch (action) {
      case "ingest_sections":
        state.sections = input.sections;
        break;

      case "extract_xbrl_universe":
        state.xbrlUniverse = extractXbrlUniverse(input.ixbrlFacts, input.companyFacts);
        break;

      case "tag_audit_status":
        state.audited = tagFilingAuditStatus(input.form);
        break;

      case "pair_annual_filings":
        state.pair = pairAnnualFilings(input.cik, input.filings, input.accessionNumber);
        break;

      case "numeric_diff": {
        if (!state.pair) break;
        state.numeric = computeNumericDiff(
          input.metrics ?? {},
          input.previousMetrics ?? {},
        );
        break;
      }

      case "structural_diff": {
        if (!state.pair) break;
        if (!input.previousSections) {
          state.structural = computeStructuralDiff(
            buildStructuralSnapshot({ proseSections: state.sections! }),
            buildStructuralSnapshot({ proseSections: state.sections! }),
          );
          break;
        }
        state.structural = computeStructuralDiff(
          buildStructuralSnapshot({ proseSections: state.sections! }),
          buildStructuralSnapshot({ proseSections: input.previousSections }),
        );
        break;
      }

      case "check_prose_cache": {
        if (!state.pair || !input.diffCache) {
          state.cacheHit = false;
          break;
        }
        const cache = await checkDiffCache(input.diffCache, {
          cik: state.cik,
          currentAccession: state.pair.current.accessionNumber,
          previousAccession: state.pair.previous.accessionNumber,
        });
        state.cacheHit = cache.hit;
        state.prose = cache.prose;
        break;
      }

      case "prose_diff": {
        if (!state.pair) break;
        if (!input.previousSections) {
          state.prose = { changed: false, sections: [], refusal: true, costUsd: 0 };
          break;
        }
        if (!input.aiDiff) {
          state.prose = { changed: false, sections: [], refusal: true, costUsd: 0 };
          break;
        }
        const result = await diffProse({
          current: state.sections!,
          previous: input.previousSections,
          aiModel: input.aiDiff,
        });
        state.prose = result;
        state.costUsd += result.costUsd;
        if (input.diffCache) {
          await writeDiffCache(
            input.diffCache,
            {
              cik: state.cik,
              currentAccession: state.pair.current.accessionNumber,
              previousAccession: state.pair.previous.accessionNumber,
            },
            result,
          );
        }
        break;
      }

      case "store_credibility":
        state.credibility = storeManagementCredibility({
          accession: input.accessionNumber,
          periodEnd: input.periodEnd,
          sections: state.sections!,
        });
        break;

      case "cross_ref_8k_events":
        state.eightKCrossRef = crossRef8kEvents(
          state.sections!,
          input.known8kEvents ?? [],
        );
        break;

      case "detect_auditor_change":
        state.auditorChange = detectAuditorChange({
          currentFacts: input.ixbrlFacts,
          currentSections: state.sections!,
          previousFacts: input.previousFacts,
          previousSections: input.previousSections,
        });
        break;

      case "confirm_pgvector_schema":
        state.pgvectorReady =
          storedChunks.length === 0 ||
          storedChunks.every(
            (c) =>
              typeof c.sectionType === "string" &&
              typeof c.audited === "boolean" &&
              (c.source === "ixbrl_textblock" || c.source === "html_heading_fallback"),
          );
        break;

      case "complete":
        state.completed = true;
        break;
    }

    return advance(state);
  }

  const state = await advance(initialState(input));

  if (!state.completed) {
    throw new Error(
      `Form 10-K agent exceeded max iterations (${maxIterations}): ${state.actionsTaken.join(" → ")}`,
    );
  }

  return toForm10kOutput(state);
}
