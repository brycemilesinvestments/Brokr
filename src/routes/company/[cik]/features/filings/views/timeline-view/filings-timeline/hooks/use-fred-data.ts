"use client";

import { useCallback, useEffect, useState } from "react";
import type { FredIngestResult, FredStatus } from "@/lib/fred/types";

type UseFredDataResult = {
  status: FredStatus | null;
  ingestResult: FredIngestResult | null;
  loadingStatus: boolean;
  ingesting: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  refetchFromFred: () => Promise<FredIngestResult | null>;
};

export function useFredData(enabled: boolean): UseFredDataResult {
  const [status, setStatus] = useState<FredStatus | null>(null);
  const [ingestResult, setIngestResult] = useState<FredIngestResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(() => enabled);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);

    try {
      const response = await fetch("/api/fred/status");
      const payload = (await response.json()) as FredStatus & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load FRED status");
      }
      setStatus(payload);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Failed to load FRED status");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const refetchFromFred = useCallback(async () => {
    setIngesting(true);
    setError(null);

    try {
      const response = await fetch("/api/fred/ingest?force=true", { method: "POST" });
      const payload = (await response.json()) as FredIngestResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "FRED refresh failed");
      }
      setIngestResult(payload);
      await refreshStatus();
      return payload;
    } catch (err) {
      setIngestResult(null);
      const message = err instanceof Error ? err.message : "FRED refresh failed";
      setError(message);
      return null;
    } finally {
      setIngesting(false);
    }
  }, [refreshStatus]);

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
