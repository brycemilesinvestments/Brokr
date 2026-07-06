"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";
import { isAnalyzableFiling } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/is-analyzable-filing";
import type { Filing } from "@/routes/company/[cik]/types";

/** SEC downloads are rate-limited server-side; keep store parallelism moderate for Supabase. */
const STORE_CONCURRENCY = 8;

/** Embeddings and LLM analysis use our own API keys; cap DB load during 10-K analysis. */
const ANALYZE_CONCURRENCY = 6;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted ?? false;
}

export type FilingPipelinePhase = "idle" | "loading-status" | "storing" | "analyzing" | "complete";

export type FilingWorkStatus =
  | "idle"
  | "queued-store"
  | "storing"
  | "queued-analyze"
  | "analyzing"
  | "complete"
  | "unavailable"
  | "error";

export type FilingPipelineProgress = {
  phase: FilingPipelinePhase;
  total: number;
  stored: number;
  analyzed: number;
  storing: number;
  storeQueued: number;
  analyzing: number;
  analyzeQueued: number;
  error: number;
  active: boolean;
};

type PipelineStatusMap = Record<string, { stored: boolean; analyzed: boolean; unavailable?: boolean }>;

type UseFilingPipelineResult = {
  getStatus: (accessionNumber: string | undefined) => FilingWorkStatus;
  getError: (accessionNumber: string | undefined) => string | null;
  progress: FilingPipelineProgress;
};

type AnalyzableFiling = Filing & { accessionNumber: string };

type PipelineState = {
  phase: FilingPipelinePhase;
  pipelineStatus: PipelineStatusMap;
  workStatusByAccession: Record<string, FilingWorkStatus>;
  errorsByAccession: Record<string, string>;
};

type PipelineAction =
  | { type: "reset" }
  | { type: "set-phase"; phase: FilingPipelinePhase }
  | { type: "set-pipeline-status"; status: PipelineStatusMap }
  | { type: "set-work-status"; accessionNumber: string; status: FilingWorkStatus }
  | { type: "set-work-error"; accessionNumber: string; message: string }
  | { type: "mark-stored"; accessionNumber: string }
  | { type: "mark-complete"; accessionNumber: string };

const INITIAL_PIPELINE_STATE: PipelineState = {
  phase: "idle",
  pipelineStatus: {},
  workStatusByAccession: {},
  errorsByAccession: {},
};

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case "reset":
      return INITIAL_PIPELINE_STATE;
    case "set-phase":
      return { ...state, phase: action.phase };
    case "set-pipeline-status":
      return { ...state, pipelineStatus: action.status };
    case "set-work-status":
      return {
        ...state,
        workStatusByAccession: {
          ...state.workStatusByAccession,
          [action.accessionNumber]: action.status,
        },
      };
    case "set-work-error":
      return {
        ...state,
        errorsByAccession: {
          ...state.errorsByAccession,
          [action.accessionNumber]: action.message,
        },
        workStatusByAccession: {
          ...state.workStatusByAccession,
          [action.accessionNumber]: "error",
        },
      };
    case "mark-stored":
      return {
        ...state,
        pipelineStatus: {
          ...state.pipelineStatus,
          [action.accessionNumber]: {
            stored: true,
            analyzed: state.pipelineStatus[action.accessionNumber]?.analyzed ?? false,
          },
        },
        workStatusByAccession: {
          ...state.workStatusByAccession,
          [action.accessionNumber]: "idle",
        },
      };
    case "mark-complete":
      return {
        ...state,
        pipelineStatus: {
          ...state.pipelineStatus,
          [action.accessionNumber]: { stored: true, analyzed: true },
        },
        workStatusByAccession: {
          ...state.workStatusByAccession,
          [action.accessionNumber]: "complete",
        },
        errorsByAccession: Object.fromEntries(
          Object.entries(state.errorsByAccession).filter(([accession]) => accession !== action.accessionNumber),
        ),
      };
    default:
      return state;
  }
}

async function fetchPipelineStatus(
  cik: string,
  accessions: string[],
  signal?: AbortSignal,
): Promise<PipelineStatusMap> {
  const response = await fetch(`/api/company/${cik}/filings/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessions }),
    signal,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load filing status (${response.status})`);
  }
  const payload = (await response.json()) as { status: PipelineStatusMap };
  return payload.status;
}

async function withRetry<T>(
  task: () => Promise<T>,
  signal?: AbortSignal,
  maxAttempts = 2,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (isAborted(signal)) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      return await task();
    } catch (error) {
      if (isAbortError(error) || isAborted(signal)) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("Request failed");
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError ?? new Error("Request failed");
}

async function storeFilingRequest(
  cik: string,
  filing: AnalyzableFiling,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/company/${cik}/filings/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessionNumber: filing.accessionNumber,
      formType: filing.type,
      filingDate: filing.filingDate,
    }),
    signal,
  });
  if (response.status === 499 || isAborted(signal)) return;
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Storage failed");
  }
}

async function analyzeFilingRequest(
  cik: string,
  accessionNumber: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/company/${cik}/filings/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessionNumber }),
    signal,
  });
  if (response.status === 499 || isAborted(signal)) return;
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Analysis failed");
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;

  let index = 0;
  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const current = items[index]!;
      index += 1;
      await worker(current);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => runWorker()));
}

async function storeFilingsPool(
  cik: string,
  filings: AnalyzableFiling[],
  dispatch: Dispatch<PipelineAction>,
  isCurrentRun: () => boolean,
  statusMap: PipelineStatusMap,
  signal?: AbortSignal,
): Promise<string[]> {
  const erroredAccessions: string[] = [];

  await runPool(filings, STORE_CONCURRENCY, async (filing) => {
    if (!isCurrentRun() || isAborted(signal)) return;

    dispatch({
      type: "set-work-status",
      accessionNumber: filing.accessionNumber,
      status: "storing",
    });

    try {
      await withRetry(() => storeFilingRequest(cik, filing, signal), signal);
    } catch (error) {
      if (!isCurrentRun() || isAbortError(error) || isAborted(signal)) return;
      const message = error instanceof Error ? error.message : "Storage failed";
      dispatch({ type: "set-work-error", accessionNumber: filing.accessionNumber, message });
      erroredAccessions.push(filing.accessionNumber);
      return;
    }

    if (!isCurrentRun() || isAborted(signal)) return;
    statusMap[filing.accessionNumber] = {
      stored: true,
      analyzed: statusMap[filing.accessionNumber]?.analyzed ?? false,
    };
    dispatch({ type: "mark-stored", accessionNumber: filing.accessionNumber });
  });

  return erroredAccessions;
}

async function analyzeFilingsPool(
  cik: string,
  filings: AnalyzableFiling[],
  dispatch: Dispatch<PipelineAction>,
  isCurrentRun: () => boolean,
  signal?: AbortSignal,
): Promise<string[]> {
  const erroredAccessions: string[] = [];

  await runPool(filings, ANALYZE_CONCURRENCY, async (filing) => {
    if (!isCurrentRun() || isAborted(signal)) return;

    dispatch({
      type: "set-work-status",
      accessionNumber: filing.accessionNumber,
      status: "analyzing",
    });

    try {
      await withRetry(() => analyzeFilingRequest(cik, filing.accessionNumber, signal), signal);
    } catch (error) {
      if (!isCurrentRun() || isAbortError(error) || isAborted(signal)) return;
      const message = error instanceof Error ? error.message : "Analysis failed";
      dispatch({ type: "set-work-error", accessionNumber: filing.accessionNumber, message });
      erroredAccessions.push(filing.accessionNumber);
      return;
    }

    if (!isCurrentRun() || isAborted(signal)) return;
    dispatch({ type: "mark-complete", accessionNumber: filing.accessionNumber });
  });

  return erroredAccessions;
}

async function recoverErroredAccessions(
  cik: string,
  erroredAccessions: string[],
  dispatch: Dispatch<PipelineAction>,
  isCurrentRun: () => boolean,
  statusMap: PipelineStatusMap,
  signal?: AbortSignal,
): Promise<void> {
  if (erroredAccessions.length === 0 || !isCurrentRun() || isAborted(signal)) return;

  try {
    const recoveredStatus = await fetchPipelineStatus(cik, erroredAccessions, signal);
    for (const accession of erroredAccessions) {
      const recovered = recoveredStatus[accession];
      if (!recovered) continue;

      statusMap[accession] = recovered;

      if (recovered.unavailable) {
        dispatch({
          type: "set-work-status",
          accessionNumber: accession,
          status: "unavailable",
        });
      } else if (recovered.analyzed) {
        dispatch({ type: "mark-complete", accessionNumber: accession });
      } else if (recovered.stored) {
        dispatch({ type: "mark-stored", accessionNumber: accession });
      }
    }
  } catch {
    // Keep displayed errors when status refresh fails.
  }
}

async function runFilingPipeline(
  cik: string,
  analyzableFilings: AnalyzableFiling[],
  dispatch: Dispatch<PipelineAction>,
  isCurrentRun: () => boolean,
  signal?: AbortSignal,
) {
  dispatch({ type: "set-phase", phase: "loading-status" });

  let status: PipelineStatusMap;
  try {
    status = await fetchPipelineStatus(
      cik,
      analyzableFilings.map((filing) => filing.accessionNumber),
      signal,
    );
  } catch (error) {
    if (!isCurrentRun() || isAbortError(error) || isAborted(signal)) return;
    const message = error instanceof Error ? error.message : "Failed to load filing status";
    for (const filing of analyzableFilings) {
      dispatch({ type: "set-work-error", accessionNumber: filing.accessionNumber, message });
    }
    dispatch({ type: "set-phase", phase: "complete" });
    return;
  }

  if (!isCurrentRun()) return;

  const statusMap: PipelineStatusMap = { ...status };

  dispatch({ type: "set-pipeline-status", status: statusMap });
  for (const filing of analyzableFilings) {
    const persisted = statusMap[filing.accessionNumber];
    if (persisted?.unavailable) {
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "unavailable",
      });
    } else if (persisted?.analyzed) {
      dispatch({ type: "set-work-status", accessionNumber: filing.accessionNumber, status: "complete" });
    }
  }

  const storeQueue = analyzableFilings.filter((filing) => {
    const persisted = statusMap[filing.accessionNumber];
    return !persisted?.stored && !persisted?.unavailable;
  });

  if (storeQueue.length > 0) {
    dispatch({ type: "set-phase", phase: "storing" });
    for (const filing of storeQueue) {
      if (!isCurrentRun()) return;
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "queued-store",
      });
    }

    const storeErrors = await storeFilingsPool(
      cik,
      storeQueue,
      dispatch,
      isCurrentRun,
      statusMap,
      signal,
    );
    await recoverErroredAccessions(cik, storeErrors, dispatch, isCurrentRun, statusMap, signal);
  }

  if (!isCurrentRun() || isAborted(signal)) return;

  const analyzeQueue = analyzableFilings.filter((filing) => {
    const persisted = statusMap[filing.accessionNumber];
    return persisted?.stored && !persisted.analyzed && !persisted.unavailable;
  });

  if (analyzeQueue.length > 0) {
    dispatch({ type: "set-phase", phase: "analyzing" });
    for (const filing of analyzeQueue) {
      if (!isCurrentRun()) return;
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "queued-analyze",
      });
    }

    const analyzeErrors = await analyzeFilingsPool(
      cik,
      analyzeQueue,
      dispatch,
      isCurrentRun,
      signal,
    );
    await recoverErroredAccessions(cik, analyzeErrors, dispatch, isCurrentRun, statusMap, signal);
  }

  if (isCurrentRun() && !isAborted(signal)) {
    dispatch({ type: "set-phase", phase: "complete" });
  }
}

async function triggerCompanyAnalysis(cik: string, ticker?: string): Promise<void> {
  await fetch(`/api/analyze/${encodeURIComponent(cik)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
}

export function useFilingPipeline(
  cik: string,
  filings: Filing[],
  enabled: boolean,
  ticker?: string,
): UseFilingPipelineResult {
  const [state, dispatch] = useReducer(pipelineReducer, INITIAL_PIPELINE_STATE);
  const runIdRef = useRef(0);
  const analysisTriggeredRef = useRef(false);

  const analyzableFilings = useMemo(
    () =>
      filings.filter(
        (filing): filing is AnalyzableFiling =>
          Boolean(filing.accessionNumber && isAnalyzableFiling(filing.type)),
      ),
    [filings],
  );

  const accessionKey = useMemo(
    () => analyzableFilings.map((filing) => filing.accessionNumber).join("|"),
    [analyzableFilings],
  );

  useEffect(() => {
    if (!enabled || analyzableFilings.length === 0) {
      dispatch({ type: "reset" });
      analysisTriggeredRef.current = false;
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const abortController = new AbortController();
    let cancelled = false;
    analysisTriggeredRef.current = false;

    const isCurrentRun = () => !cancelled && runIdRef.current === runId;

    void runFilingPipeline(cik, analyzableFilings, dispatch, isCurrentRun, abortController.signal);

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [cik, enabled, accessionKey, analyzableFilings]);

  const progress = useMemo((): FilingPipelineProgress => {
    const total = analyzableFilings.length;
    let stored = 0;
    let analyzed = 0;
    let storing = 0;
    let storeQueued = 0;
    let analyzing = 0;
    let analyzeQueued = 0;
    let error = 0;

    for (const filing of analyzableFilings) {
      const accession = filing.accessionNumber;
      const persisted = state.pipelineStatus[accession];
      if (persisted?.stored) stored += 1;
      if (persisted?.analyzed) analyzed += 1;

      const workStatus =
        state.workStatusByAccession[accession] ?? (persisted?.analyzed ? "complete" : "idle");
      if (workStatus === "error") error += 1;
      if (workStatus === "storing" && state.phase === "storing") storing += 1;
      if (workStatus === "queued-store" && state.phase === "storing") storeQueued += 1;
      if (workStatus === "analyzing" && state.phase === "analyzing") analyzing += 1;
      if (workStatus === "queued-analyze" && state.phase === "analyzing") analyzeQueued += 1;
    }

    const active =
      state.phase === "loading-status" || state.phase === "storing" || state.phase === "analyzing";

    return {
      phase: state.phase,
      total,
      stored,
      analyzed,
      storing,
      storeQueued,
      analyzing,
      analyzeQueued,
      error,
      active,
    };
  }, [analyzableFilings, state]);

  useEffect(() => {
    if (!enabled || progress.active) return;
    if (progress.analyzed === 0) return;
    if (analysisTriggeredRef.current) return;

    analysisTriggeredRef.current = true;
    void triggerCompanyAnalysis(cik, ticker);
  }, [cik, enabled, progress.active, progress.analyzed, ticker]);

  const getStatus = useCallback(
    (accessionNumber: string | undefined): FilingWorkStatus => {
      if (!accessionNumber) return "idle";
      const workStatus = state.workStatusByAccession[accessionNumber];
      if (workStatus) return workStatus;
      if (state.pipelineStatus[accessionNumber]?.unavailable) return "unavailable";
      if (state.pipelineStatus[accessionNumber]?.analyzed) return "complete";
      return "idle";
    },
    [state.pipelineStatus, state.workStatusByAccession],
  );

  const getError = useCallback(
    (accessionNumber: string | undefined): string | null =>
      accessionNumber ? state.errorsByAccession[accessionNumber] ?? null : null,
    [state.errorsByAccession],
  );

  return { getStatus, getError, progress };
}
