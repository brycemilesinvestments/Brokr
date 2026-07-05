"use client";

import { useEffect, useMemo, useState } from "react";
import { isAnalyzableFiling } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/is-analyzable-filing";
import type { Filing } from "@/routes/company/[cik]/types";

export type FilingAnalysisStatus = "idle" | "queued" | "loading" | "complete" | "error";

export type FilingAnalysisProgress = {
  total: number;
  complete: number;
  loading: number;
  queued: number;
  error: number;
  remaining: number;
  active: boolean;
};

type UseFilingAnalysisQueueResult = {
  getStatus: (accessionNumber: string | undefined) => FilingAnalysisStatus;
  getError: (accessionNumber: string | undefined) => string | null;
  progress: FilingAnalysisProgress;
};

const CONCURRENCY = 2;

function analyzeEndpoint(cik: string, filing: Filing): string | null {
  const accession = filing.accessionNumber;
  if (!accession) return null;

  const encoded = encodeURIComponent(accession);
  if (/^8-K/i.test(filing.type)) {
    return `/api/company/${cik}/form-8k/${encoded}/analyze`;
  }
  if (/^10-K/i.test(filing.type)) {
    return `/api/company/${cik}/form-10k/${encoded}/analyze`;
  }
  return null;
}

export function useFilingAnalysisQueue(
  cik: string,
  filings: Filing[],
  enabled: boolean,
  ticker?: string,
): UseFilingAnalysisQueueResult {
  const [statusByAccession, setStatusByAccession] = useState<Record<string, FilingAnalysisStatus>>({});
  const [errorsByAccession, setErrorsByAccession] = useState<Record<string, string>>({});

  const analyzableFilings = useMemo(
    () => filings.filter((filing) => filing.accessionNumber && isAnalyzableFiling(filing.type)),
    [filings],
  );

  const accessionKey = useMemo(
    () => analyzableFilings.map((filing) => filing.accessionNumber).join("|"),
    [analyzableFilings],
  );

  useEffect(() => {
    if (!enabled || analyzableFilings.length === 0) return;

    let cancelled = false;
    const queue = [...analyzableFilings];

    setStatusByAccession(
      Object.fromEntries(
        analyzableFilings.map((filing) => [filing.accessionNumber!, "queued" satisfies FilingAnalysisStatus]),
      ),
    );
    setErrorsByAccession({});

    function setStatus(accessionNumber: string, status: FilingAnalysisStatus) {
      if (cancelled) return;
      setStatusByAccession((prev) => ({ ...prev, [accessionNumber]: status }));
    }

    async function analyzeOne(filing: Filing) {
      const accessionNumber = filing.accessionNumber;
      const endpoint = analyzeEndpoint(cik, filing);
      if (!accessionNumber || !endpoint) return;

      setStatus(accessionNumber, "loading");

      try {
        const response = await fetch(endpoint, { method: "POST" });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Analysis failed");
        }
        setStatus(accessionNumber, "complete");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        if (!cancelled) {
          setErrorsByAccession((prev) => ({ ...prev, [accessionNumber]: message }));
        }
        setStatus(accessionNumber, "error");
      }
    }

    async function runWorkers() {
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (!cancelled) {
          const filing = queue.shift();
          if (!filing) break;
          await analyzeOne(filing);
        }
      });
      await Promise.all(workers);
    }

    void runWorkers();

    return () => {
      cancelled = true;
    };
  }, [cik, enabled, analyzableFilings, accessionKey]);

  const progress = useMemo((): FilingAnalysisProgress => {
    const total = analyzableFilings.length;
    let complete = 0;
    let loading = 0;
    let queued = 0;
    let error = 0;

    for (const filing of analyzableFilings) {
      const accession = filing.accessionNumber;
      if (!accession) continue;
      const status = statusByAccession[accession] ?? "idle";
      if (status === "complete") complete += 1;
      if (status === "loading") loading += 1;
      if (status === "queued") queued += 1;
      if (status === "error") error += 1;
    }

    const remaining = queued + loading;
    const active = remaining > 0 || (complete + error < total && total > 0);

    return { total, complete, loading, queued, error, remaining, active };
  }, [analyzableFilings, statusByAccession]);

  useEffect(() => {
    if (!enabled || progress.active) return;
    if (progress.complete === 0) return;

    void fetch(`/api/analyze/${encodeURIComponent(cik)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
  }, [cik, enabled, progress.active, progress.complete, ticker]);

  return {
    getStatus: (accessionNumber) => {
      if (!accessionNumber) return "idle";
      return statusByAccession[accessionNumber] ?? "idle";
    },
    getError: (accessionNumber) => (accessionNumber ? errorsByAccession[accessionNumber] ?? null : null),
    progress,
  };
}
