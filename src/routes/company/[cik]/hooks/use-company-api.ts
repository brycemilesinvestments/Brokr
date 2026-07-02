"use client";

import { useCallback, useEffect, useState } from "react";

type UseCompanyApiResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCompanyApi<T>(url: string | null, enabled: boolean): UseCompanyApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(() => Boolean(enabled && url));
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as T & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed");
      }
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled || !url) return;
    void refetch();
  }, [enabled, url, refetch]);

  return { data, loading, error, refetch };
}
