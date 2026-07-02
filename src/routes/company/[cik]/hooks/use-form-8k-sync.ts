"use client";

import { useCallback, useEffect, useState } from "react";
import type { Form8kSyncResponse } from "@/routes/company/[cik]/types";

type UseForm8kSyncResult = {
  data: Form8kSyncResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useForm8kSync(cik: string, enabled: boolean): UseForm8kSyncResult {
  const [data, setData] = useState<Form8kSyncResponse | null>(null);
  const [loading, setLoading] = useState(() => enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/company/${cik}/form-8k/sync`, { method: "POST" });
      const payload = (await response.json()) as Form8kSyncResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "8-K sync failed");
      }
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "8-K sync failed");
    } finally {
      setLoading(false);
    }
  }, [cik]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return { data, loading, error, refetch };
}
