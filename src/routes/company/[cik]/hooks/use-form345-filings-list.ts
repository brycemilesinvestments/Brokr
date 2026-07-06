"use client";

import { useCallback, useEffect, useState } from "react";
import type { Filing } from "@/routes/company/[cik]/types";

type Form345FilingsListState = {
  filings: Filing[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

async function fetchForm345Filings(cik: string, signal?: AbortSignal): Promise<Filing[]> {
  const response = await fetch(
    `/api/company/${encodeURIComponent(cik)}/form-345/filings?limit=40`,
    { signal },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load Form 3/4/5 filings (${response.status})`);
  }

  const payload = (await response.json()) as { filings: Filing[] };
  return payload.filings;
}

export function useForm345FilingsList(cik: string, enabled: boolean): Form345FilingsListState {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setFilings([]);
      setLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    void fetchForm345Filings(cik, abortController.signal)
      .then((nextFilings) => {
        setFilings(nextFilings);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (abortController.signal.aborted) return;
        setFilings([]);
        setLoading(false);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load Form 3/4/5 filings");
      });

    return () => {
      abortController.abort();
    };
  }, [cik, enabled, reloadToken]);

  return { filings, loading, error, reload };
}
