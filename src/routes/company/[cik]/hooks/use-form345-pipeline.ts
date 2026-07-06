"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";
import { isForm345Filing } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/is-form345-filing";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";

const INGEST_CONCURRENCY = 4;

type Form345Filing = Filing & { accessionNumber: string };

export type Form345PipelineProgress = {
  phase: "idle" | "loading-status" | "ingesting" | "complete";
  total: number;
  ingested: number;
  ingesting: number;
  queued: number;
  error: number;
  active: boolean;
};

type UseForm345PipelineResult = {
  getStatus: (accessionNumber: string | undefined, formType?: string) => FilingWorkStatus;
  getError: (accessionNumber: string | undefined) => string | null;
  progress: Form345PipelineProgress;
};

type PipelineStatusMap = Record<string, { processed: boolean }>;

type PipelineState = {
  phase: Form345PipelineProgress["phase"];
  pipelineStatus: PipelineStatusMap;
  workStatusByAccession: Record<string, FilingWorkStatus>;
  errorsByAccession: Record<string, string>;
};

type PipelineAction =
  | { type: "reset" }
  | { type: "set-phase"; phase: Form345PipelineProgress["phase"] }
  | { type: "set-pipeline-status"; status: PipelineStatusMap }
  | { type: "set-work-status"; accessionNumber: string; status: FilingWorkStatus }
  | { type: "set-work-error"; accessionNumber: string; message: string }
  | { type: "mark-processed"; accessionNumber: string };

const INITIAL_STATE: PipelineState = {
  phase: "idle",
  pipelineStatus: {},
  workStatusByAccession: {},
  errorsByAccession: {},
};

function pipelineReducer(state: PipelineState, action: PipelineAction): PipelineState {
  switch (action.type) {
    case "reset":
      return INITIAL_STATE;
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
    case "mark-processed":
      return {
        ...state,
        pipelineStatus: {
          ...state.pipelineStatus,
          [action.accessionNumber]: { processed: true },
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchForm345Status(
  cik: string,
  accessions: string[],
  signal?: AbortSignal,
): Promise<PipelineStatusMap> {
  const response = await fetch(`/api/company/${encodeURIComponent(cik)}/form-345/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessions }),
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load Form 3/4/5 status (${response.status})`);
  }

  const payload = (await response.json()) as { status: PipelineStatusMap };
  return payload.status;
}

async function syncForm345Batch(
  cik: string,
  filings: Form345Filing[],
  signal?: AbortSignal,
): Promise<{
  failures: Array<{ accessionNumber: string; error: string }>;
}> {
  const response = await fetch(`/api/company/${encodeURIComponent(cik)}/form-345/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filings: filings.map((filing) => ({
        accessionNumber: filing.accessionNumber,
        filedDate: filing.filingDate,
        formType: filing.type,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Form 3/4/5 sync failed (${response.status})`);
  }

  return response.json() as Promise<{
    failures: Array<{ accessionNumber: string; error: string }>;
  }>;
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

async function runForm345Pipeline(
  cik: string,
  form345Filings: Form345Filing[],
  dispatch: Dispatch<PipelineAction>,
  isCurrentRun: () => boolean,
  signal?: AbortSignal,
) {
  dispatch({ type: "set-phase", phase: "loading-status" });

  let status: PipelineStatusMap;
  try {
    status = await fetchForm345Status(
      cik,
      form345Filings.map((filing) => filing.accessionNumber),
      signal,
    );
  } catch (error) {
    if (!isCurrentRun() || isAbortError(error)) return;
    const message = error instanceof Error ? error.message : "Failed to load Form 3/4/5 status";
    for (const filing of form345Filings) {
      dispatch({ type: "set-work-error", accessionNumber: filing.accessionNumber, message });
    }
    dispatch({ type: "set-phase", phase: "complete" });
    return;
  }

  if (!isCurrentRun()) return;

  const statusMap: PipelineStatusMap = { ...status };
  dispatch({ type: "set-pipeline-status", status: statusMap });

  for (const filing of form345Filings) {
    if (statusMap[filing.accessionNumber]?.processed) {
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "complete",
      });
    }
  }

  const ingestQueue = form345Filings.filter((filing) => !statusMap[filing.accessionNumber]?.processed);
  if (ingestQueue.length === 0) {
    dispatch({ type: "set-phase", phase: "complete" });
    return;
  }

  dispatch({ type: "set-phase", phase: "ingesting" });

  const batches: Form345Filing[][] = [];
  for (let index = 0; index < ingestQueue.length; index += INGEST_CONCURRENCY) {
    batches.push(ingestQueue.slice(index, index + INGEST_CONCURRENCY));
  }

  for (const batch of batches) {
    if (!isCurrentRun() || signal?.aborted) return;

    for (const filing of batch) {
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "queued-store",
      });
    }

    for (const filing of batch) {
      if (!isCurrentRun() || signal?.aborted) return;
      dispatch({
        type: "set-work-status",
        accessionNumber: filing.accessionNumber,
        status: "storing",
      });
    }

    try {
      const result = await syncForm345Batch(cik, batch, signal);
      for (const filing of batch) {
        if (!isCurrentRun()) return;

        const failure = result.failures.find(
          (entry) => entry.accessionNumber === filing.accessionNumber,
        );

        if (failure) {
          dispatch({
            type: "set-work-error",
            accessionNumber: filing.accessionNumber,
            message: failure.error,
          });
          continue;
        }

        statusMap[filing.accessionNumber] = { processed: true };
        dispatch({ type: "mark-processed", accessionNumber: filing.accessionNumber });
      }
    } catch (error) {
      if (!isCurrentRun() || isAbortError(error)) return;
      const message = error instanceof Error ? error.message : "Form 3/4/5 sync failed";
      for (const filing of batch) {
        dispatch({ type: "set-work-error", accessionNumber: filing.accessionNumber, message });
      }
    }
  }

  if (isCurrentRun()) {
    dispatch({ type: "set-phase", phase: "complete" });
  }
}

export function useForm345Pipeline(
  cik: string,
  filings: Filing[],
  enabled: boolean,
): UseForm345PipelineResult {
  const [state, dispatch] = useReducer(pipelineReducer, INITIAL_STATE);
  const runIdRef = useRef(0);

  const form345Filings = useMemo(
    () =>
      filings.filter(
        (filing): filing is Form345Filing =>
          Boolean(filing.accessionNumber && isForm345Filing(filing.type)),
      ),
    [filings],
  );

  const accessionKey = useMemo(
    () => form345Filings.map((filing) => filing.accessionNumber).join("|"),
    [form345Filings],
  );

  useEffect(() => {
    if (!enabled || form345Filings.length === 0) {
      dispatch({ type: "reset" });
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const abortController = new AbortController();
    let cancelled = false;

    const isCurrentRun = () => !cancelled && runIdRef.current === runId;

    void runForm345Pipeline(
      cik,
      form345Filings,
      dispatch,
      isCurrentRun,
      abortController.signal,
    );

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [cik, enabled, accessionKey, form345Filings]);

  const progress = useMemo((): Form345PipelineProgress => {
    let ingested = 0;
    let ingesting = 0;
    let queued = 0;
    let error = 0;

    for (const filing of form345Filings) {
      const accession = filing.accessionNumber;
      if (state.pipelineStatus[accession]?.processed) ingested += 1;

      const workStatus = state.workStatusByAccession[accession] ?? "idle";
      if (workStatus === "error") error += 1;
      if (workStatus === "storing" && state.phase === "ingesting") ingesting += 1;
      if (workStatus === "queued-store" && state.phase === "ingesting") queued += 1;
    }

    const active = state.phase === "loading-status" || state.phase === "ingesting";

    return {
      phase: state.phase,
      total: form345Filings.length,
      ingested,
      ingesting,
      queued,
      error,
      active,
    };
  }, [form345Filings, state]);

  const getStatus = useCallback(
    (accessionNumber: string | undefined, formType?: string): FilingWorkStatus => {
      if (!accessionNumber || !formType || !isForm345Filing(formType)) return "idle";
      const workStatus = state.workStatusByAccession[accessionNumber];
      if (workStatus) return workStatus;
      if (state.pipelineStatus[accessionNumber]?.processed) return "complete";
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
