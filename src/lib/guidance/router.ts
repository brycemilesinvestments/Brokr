import { check_cache } from "@/lib/guidance/check_cache";
import { extract_guidance } from "@/lib/guidance/extract_guidance";
import { extract_tagged_numbers } from "@/lib/guidance/extract_tagged_numbers";
import { audit_earnings_8k, find_earnings_8k } from "@/lib/guidance/find_earnings_8k";
import { track_vs_actual } from "@/lib/guidance/track_vs_actual";
import type {
  Earnings8kCandidate,
  GuidanceExtraction,
  GuidanceRouterAction,
  GuidanceRouterInput,
  GuidanceRouterOutput,
  GuidanceRouterState,
} from "@/lib/guidance/types";
import { write_cache } from "@/lib/guidance/write_cache";

const DEFAULT_MAX_ITERATIONS = 12;

function create_initial_state(input: GuidanceRouterInput): GuidanceRouterState {
  return {
    cik: input.cik,
    iteration: 0,
    completed: false,
    costUsd: 0,
    filings: input.filings,
    ixbrlFactsByAccession: input.ixbrlFactsByAccession ?? {},
    candidates: null,
    earnings8kAudit: null,
    taggedNumbersByAccession: null,
    cacheByAccession: null,
    extractedByAccession: null,
    comparisonsByAccession: null,
    actionsTaken: [],
    errors: [],
  };
}

/**
 * G7 — Route to the next required guidance action.
 */
export function route_guidance_action(state: GuidanceRouterState): GuidanceRouterAction {
  if (state.completed) return "complete";
  if (state.candidates === null) return "find_earnings_8k";
  if (state.taggedNumbersByAccession === null) return "extract_tagged_numbers";
  if (state.cacheByAccession === null) return "check_cache";
  if (state.extractedByAccession === null) return "extract_guidance";
  if (!state.actionsTaken.includes("write_cache")) return "write_cache";
  if (state.comparisonsByAccession === null) return "track_vs_actual";
  return "complete";
}

function apply_completed(
  state: GuidanceRouterState,
  action: GuidanceRouterAction,
): GuidanceRouterState {
  return {
    ...state,
    actionsTaken: [...state.actionsTaken, action],
    iteration: state.iteration + 1,
  };
}

export async function run_guidance_router(
  input: GuidanceRouterInput,
): Promise<GuidanceRouterOutput> {
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let state = create_initial_state(input);
  let terminatedReason: GuidanceRouterOutput["terminatedReason"] = "complete";

  while (state.iteration < maxIterations) {
    const action = route_guidance_action(state);
    if (action === "complete") {
      state = { ...state, completed: true };
      break;
    }

    if (action === "find_earnings_8k") {
      const audit = audit_earnings_8k(state.filings);
      state = apply_completed(
        {
          ...state,
          earnings8kAudit: audit,
          candidates: audit.reduce<Earnings8kCandidate[]>((acc, entry) => {
            if (entry.accepted) {
              acc.push({
                cik: state.cik,
                accessionNumber: entry.accessionNumber,
                filingDate: entry.filingDate,
                form: entry.form,
                primaryDocument: entry.primaryDocument,
                score: entry.score,
                reasons: entry.reasons,
              });
            }
            return acc;
          }, []),
        },
        action,
      );
      continue;
    }

    if (action === "extract_tagged_numbers") {
      const numbersByAccession: Record<string, ReturnType<typeof extract_tagged_numbers>> = {};
      for (const candidate of state.candidates ?? []) {
        const facts = state.ixbrlFactsByAccession[candidate.accessionNumber] ?? [];
        numbersByAccession[candidate.accessionNumber] = extract_tagged_numbers(
          candidate.accessionNumber,
          facts,
        );
      }

      state = apply_completed(
        { ...state, taggedNumbersByAccession: numbersByAccession },
        action,
      );
      continue;
    }

    if (action === "check_cache") {
      const candidates = state.candidates ?? [];
      const cacheEntries = await Promise.all(
        candidates.map(async (candidate) => {
          const result = await check_cache(input.cache, input.cik, candidate.accessionNumber);
          return [candidate.accessionNumber, result.record] as const;
        }),
      );
      const cacheByAccession: Record<string, Awaited<ReturnType<typeof check_cache>>["record"]> =
        Object.fromEntries(cacheEntries);

      state = apply_completed({ ...state, cacheByAccession }, action);
      continue;
    }

    if (action === "extract_guidance") {
      const extractionResults = await Promise.all(
        (state.candidates ?? []).map(async (candidate) => {
          const cached = state.cacheByAccession?.[candidate.accessionNumber] ?? null;
          if (cached) {
            return {
              accession: candidate.accessionNumber,
              guidance: cached.guidance,
              costUsd: 0,
              error: null as string | null,
            };
          }

          try {
            const result = await extract_guidance({
              input: {
                cik: input.cik,
                filing: {
                  cik: candidate.cik,
                  accessionNumber: candidate.accessionNumber,
                  form: candidate.form,
                  filingDate: candidate.filingDate,
                  reportDate: candidate.reportDate,
                  primaryDocument: candidate.primaryDocument,
                },
                taggedNumbers: state.taggedNumbersByAccession?.[candidate.accessionNumber] ?? [],
              },
              aiClient: input.aiClient,
              extractor: input.aiExtractor,
            });

            return {
              accession: candidate.accessionNumber,
              guidance: result.guidance,
              costUsd: result.costUsd,
              error: null as string | null,
            };
          } catch (error) {
            return {
              accession: candidate.accessionNumber,
              guidance: {
                found: false,
                hasGuidance: false,
                ranges: [],
              } as GuidanceExtraction,
              costUsd: 0,
              error: `Guidance extraction failed for ${candidate.accessionNumber}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            };
          }
        }),
      );

      const extractedByAccession: Record<string, GuidanceExtraction> = {};
      let stepCost = 0;
      const stepErrors: string[] = [];
      for (const result of extractionResults) {
        extractedByAccession[result.accession] = result.guidance;
        stepCost += result.costUsd;
        if (result.error) stepErrors.push(result.error);
      }

      state = apply_completed(
        {
          ...state,
          extractedByAccession,
          costUsd: state.costUsd + stepCost,
          errors: [...state.errors, ...stepErrors],
        },
        action,
      );
      continue;
    }

    if (action === "write_cache") {
      await Promise.all(
        (state.candidates ?? []).map(async (candidate) => {
          const accession = candidate.accessionNumber;
          if (state.cacheByAccession?.[accession]) return;
          const guidance = state.extractedByAccession?.[accession];
          if (!guidance) return;
          await write_cache(input.cache, input.cik, accession, guidance);
        }),
      );

      state = apply_completed(state, action);
      continue;
    }

    if (action === "track_vs_actual") {
      const comparisonsByAccession: Record<string, ReturnType<typeof track_vs_actual>> = {};
      for (const candidate of state.candidates ?? []) {
        const accession = candidate.accessionNumber;
        const guidance = state.extractedByAccession?.[accession] ?? {
          found: false,
          hasGuidance: false,
          ranges: [],
        };
        const taggedNumbers = state.taggedNumbersByAccession?.[accession] ?? [];
        comparisonsByAccession[accession] = track_vs_actual(guidance, taggedNumbers);
      }

      state = apply_completed(
        { ...state, comparisonsByAccession },
        action,
      );
      continue;
    }
  }

  if (!state.completed && state.iteration >= maxIterations) {
    terminatedReason = "max_iterations";
  }

  const cacheHits: string[] = [];
  for (const candidate of state.candidates ?? []) {
    if (state.cacheByAccession?.[candidate.accessionNumber]) {
      cacheHits.push(candidate.accessionNumber);
    }
  }

  return {
    cik: state.cik,
    candidates: state.candidates ?? [],
    earnings8kAudit: state.earnings8kAudit ?? [],
    taggedNumbersByAccession: state.taggedNumbersByAccession ?? {},
    guidanceByAccession: state.extractedByAccession ?? {},
    comparisonsByAccession: state.comparisonsByAccession ?? {},
    cacheHits,
    iterations: state.iteration,
    costUsd: state.costUsd,
    completed: state.completed || terminatedReason === "complete",
    terminatedReason,
    errors: state.errors,
  };
}
