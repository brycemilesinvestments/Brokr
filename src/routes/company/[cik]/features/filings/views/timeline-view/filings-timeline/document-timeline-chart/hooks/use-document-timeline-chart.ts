import { use, useMemo } from "react";
import type { FredTimelineEvent } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { buildStockHistoryRange } from "../lib/build-stock-history-range";
import { buildDocumentTimelineChartData } from "../lib/build-chart-data";
import { loadStockHistory } from "../lib/load-stock-history-client";

export function useDocumentTimelineChart({
  cik,
  timeline,
  fredEvents = [],
}: {
  cik: string;
  timeline: TimelineFiling[];
  fredEvents?: FredTimelineEvent[];
}) {
  const eightKFilings = useMemo(
    () => timeline.filter((filing) => filing.category === "8-K"),
    [timeline],
  );

  const { period1, period2 } = useMemo(
    () => buildStockHistoryRange(eightKFilings),
    [eightKFilings],
  );

  const data = use(loadStockHistory(cik, period1, period2));

  const { chartData, filingMarkers, fredMarkers, markers } = useMemo(
    () => buildDocumentTimelineChartData(data.quotes ?? [], eightKFilings, fredEvents),
    [data.quotes, eightKFilings, fredEvents],
  );

  const latestPrice = chartData[chartData.length - 1]?.close ?? null;

  return {
    eightKFilings,
    data,
    chartData,
    filingMarkers,
    fredMarkers,
    markers,
    latestPrice,
    hasChartData: chartData.length > 0,
  };
}
