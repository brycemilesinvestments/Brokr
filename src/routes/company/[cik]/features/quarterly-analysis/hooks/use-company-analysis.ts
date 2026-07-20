"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyAnalysisResponse } from "@/routes/company/[cik]/features/quarterly-analysis/types";

type UseCompanyAnalysisResult = {
  data: CompanyAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  missing: boolean;
  refetch: () => void;
  compile: () => Promise<void>;
};

export function useCompanyAnalysis(
  cik: string,
  enabled: boolean,
  ticker?: string,
): UseCompanyAnalysisResult {
  const [data, setData] = useState<CompanyAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissing(false);

    try {
      const response = await fetch(`/api/analyze/${encodeURIComponent(cik)}`);

      if (response.status === 404) {
        const payload = (await response.json()) as { message?: string };
        setData(null);
        setMissing(true);
        setError(
          payload.message ??
            "No compiled analysis yet. Important filings are still being processed.",
        );
        return;
      }

      const payload = (await response.json()) as CompanyAnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load analysis");
      }

      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [cik]);

  const compile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissing(false);

    try {
      const response = await fetch(`/api/analyze/${encodeURIComponent(cik)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      const payload = (await response.json()) as CompanyAnalysisResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to compile analysis");
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile analysis");
    } finally {
      setLoading(false);
    }
  }, [cik, ticker]);

  useEffect(() => {
    if (!enabled) return;
    void fetchAnalysis();
  }, [enabled, fetchAnalysis]);

  return { data, loading, error, missing, refetch: fetchAnalysis, compile };
}

/** @deprecated Use useCompanyAnalysis */
const useQuarterlyAnalysis = useCompanyAnalysis;
