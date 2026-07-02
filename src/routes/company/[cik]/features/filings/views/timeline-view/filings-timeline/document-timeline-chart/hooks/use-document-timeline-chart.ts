import { use, useMemo } from "react";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { buildStockHistoryRange } from "../lib/build-stock-history-range";
import { buildDocumentTimelineChartData } from "../lib/build-chart-data";
import { loadStockHistory } from "../lib/load-stock-history-client";

export function useDocumentTimelineChart({
  cik,
  timeline,
}: {
  cik: string;
  timeline: TimelineFiling[];
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

  const { chartData, markers } = useMemo(
    () => buildDocumentTimelineChartData(data.quotes ?? [], eightKFilings),
    [data.quotes, eightKFilings],
  );

  const latestPrice = chartData[chartData.length - 1]?.close ?? null;

  return {
    eightKFilings,
    data,
    chartData,
    markers,
    latestPrice,
    hasChartData: chartData.length > 0,
  };
}
