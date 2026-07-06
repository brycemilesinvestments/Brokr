"use client";

import { useCallback, useEffect, useState } from "react";
import type { InsiderTransactionsPage } from "@/routes/company/[cik]/features/insider-transactions/types";

type UseInsiderPageResult = {
  page: InsiderTransactionsPage | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

async function fetchInsiderPage(cik: string, signal?: AbortSignal): Promise<InsiderTransactionsPage> {
  const response = await fetch(`/api/company/${encodeURIComponent(cik)}/insider`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load insider transactions (${response.status})`);
  }
  return response.json() as Promise<InsiderTransactionsPage>;
}

export function useInsiderPage(cik: string, enabled: boolean): UseInsiderPageResult {
  const [page, setPage] = useState<InsiderTransactionsPage | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPage(null);
      setLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    void fetchInsiderPage(cik, abortController.signal)
      .then((nextPage) => {
        setPage(nextPage);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (abortController.signal.aborted) return;
        setPage(null);
        setLoading(false);
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load insider transactions",
        );
      });

    return () => {
      abortController.abort();
    };
  }, [cik, enabled, reloadToken]);

  return { page, loading, error, reload };
}
