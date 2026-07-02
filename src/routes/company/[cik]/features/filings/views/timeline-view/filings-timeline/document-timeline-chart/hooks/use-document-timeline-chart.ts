import { useEffect, useMemo, useState } from "react";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { buildDocumentTimelineChartData } from "../lib/build-chart-data";
import type { StockHistoryResponse } from "../types";

const BUFFER_MS = 30 * 86_400_000;

export function useDocumentTimelineChart({
  cik,
  timeline,
  enabled,
}: {
  cik: string;
  timeline: TimelineFiling[];
  enabled: boolean;
}) {
  const eightKFilings = useMemo(
    () => timeline.filter((filing) => filing.category === "8-K"),
    [timeline],
  );

  const [data, setData] = useState<StockHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const period2 = Math.floor(Date.now() / 1000);
        let period1 = period2 - 365 * 24 * 60 * 60;

        if (eightKFilings.length > 0) {
          const earliestFiling = Math.min(
            ...eightKFilings.map((filing) => Date.parse(`${filing.filingDate}T00:00:00Z`)),
          );
          period1 = Math.floor((earliestFiling - BUFFER_MS) / 1000);
        }

        const response = await fetch(
          `/api/company/${cik}/stock-history?from=${period1}&to=${period2}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as StockHistoryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load stock history");
        }

        setData(payload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Failed to load stock history");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [cik, enabled, eightKFilings]);

  const { chartData, markers } = useMemo(
    () => buildDocumentTimelineChartData(data?.quotes ?? [], eightKFilings),
    [data?.quotes, eightKFilings],
  );

  const latestPrice = chartData[chartData.length - 1]?.close ?? null;

  return {
    eightKFilings,
    data,
    loading,
    error,
    chartData,
    markers,
    latestPrice,
    hasChartData: chartData.length > 0,
  };
}
