"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FredIngestResult, FredStatus } from "@/lib/fred/types";

const INGEST_POLL_INTERVAL_MS = 2_000;

type IngestProgressContext = {
  started: boolean;
  baselineCompletedCount: number;
};

function advanceIngestProgress(
  status: FredStatus,
  context: IngestProgressContext,
): { complete: boolean; started: boolean } {
  const started =
    context.started ||
    status.inProgressSeries != null ||
    status.completedSeriesCount < context.baselineCompletedCount;

  const processedCount = status.completedSeriesCount + status.failedSeries.length;
  const complete =
    started &&
    status.inProgressSeries == null &&
    processedCount >= status.targetSeriesCount;

  return { complete, started };
}

type UseFredDataResult = {
  status: FredStatus | null;
  ingestResult: FredIngestResult | null;
  loadingStatus: boolean;
  ingesting: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  refetchFromFred: () => Promise<boolean>;
};

export function useFredData(enabled: boolean): UseFredDataResult {
  const [status, setStatus] = useState<FredStatus | null>(null);
  const [ingestResult, setIngestResult] = useState<FredIngestResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(() => enabled);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ingestSessionRef = useRef(0);

  const fetchStatus = useCallback(async (options?: { silent?: boolean }): Promise<FredStatus | null> => {
    if (!options?.silent) {
      setLoadingStatus(true);
      setError(null);
    }

    try {
      const response = await fetch("/api/fred/status");
      const payload = (await response.json()) as FredStatus & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load FRED status");
      }
      setStatus(payload);
      return payload;
    } catch (err) {
      if (!options?.silent) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Failed to load FRED status");
      }
      return null;
    } finally {
      if (!options?.silent) {
        setLoadingStatus(false);
      }
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  const refetchFromFred = useCallback(async () => {
    const sessionId = ingestSessionRef.current + 1;
    ingestSessionRef.current = sessionId;

    setIngesting(true);
    setError(null);

    const progress: IngestProgressContext = {
      started: false,
      baselineCompletedCount: status?.completedSeriesCount ?? 0,
    };

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let settled = false;

    const finish = (
      result: FredIngestResult | null,
      ingestError: string | null = null,
    ): boolean => {
      if (settled || ingestSessionRef.current !== sessionId) return false;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (result) setIngestResult(result);
      if (ingestError) {
        setIngestResult(null);
        setError(ingestError);
      }
      setIngesting(false);
      return ingestError == null;
    };

    const pollOnce = async (): Promise<boolean> => {
      const nextStatus = await fetchStatus({ silent: true });
      if (!nextStatus || ingestSessionRef.current !== sessionId) return false;

      const nextProgress = advanceIngestProgress(nextStatus, progress);
      progress.started = nextProgress.started;
      return nextProgress.complete;
    };

    pollTimer = setInterval(() => {
      void pollOnce().then((complete) => {
        if (complete) finish(null);
      });
    }, INGEST_POLL_INTERVAL_MS);

    void pollOnce().then((complete) => {
      if (complete) finish(null);
    });

    try {
      const response = await fetch("/api/fred/ingest?force=true", { method: "POST" });
      const payload = (await response.json()) as FredIngestResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "FRED refresh failed");
      }
      return finish(payload);
    } catch (err) {
      const complete = await pollOnce();
      if (complete) {
        return finish(null);
      }

      const message = err instanceof Error ? err.message : "FRED refresh failed";
      return finish(null, message);
    }
  }, [fetchStatus, status?.completedSeriesCount]);

  useEffect(() => {
    if (!enabled) return;
    void refreshStatus();
  }, [enabled, refreshStatus]);

  return {
    status,
    ingestResult,
    loadingStatus,
    ingesting,
    error,
    refreshStatus,
    refetchFromFred,
  };
}
