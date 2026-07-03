import { use, useMemo } from "react";
import type { FredTimelineEvent } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { buildStockHistoryRange } from "../lib/build-stock-history-range";
import { buildDocumentTimelineChartData } from "../lib/build-chart-data";
import { buildTimelineEvents, buildChartMarkerDisplays } from "../lib/build-timeline-events";
import { loadStockHistory } from "../lib/load-stock-history-client";

export function useDocumentTimelineChart({
  cik,
  filings,
  fredEvents = [],
}: {
  cik: string;
  filings: TimelineFiling[];
  fredEvents?: FredTimelineEvent[];
}) {
  const { period1, period2 } = useMemo(
    () => buildStockHistoryRange(filings, fredEvents),
    [filings, fredEvents],
  );

  const data = use(loadStockHistory(cik, period1, period2));

  const { chartData, filingMarkers, fredMarkers, markers, quoteDates, closeByDate } = useMemo(
    () => buildDocumentTimelineChartData(data.quotes ?? [], filings, fredEvents),
    [data.quotes, filings, fredEvents],
  );

  const rankedEvents = useMemo(
    () => buildTimelineEvents(markers, quoteDates, closeByDate),
    [markers, quoteDates, closeByDate],
  );

  const chartMarkers = useMemo(() => buildChartMarkerDisplays(markers), [markers]);

  const latestPrice = chartData[chartData.length - 1]?.close ?? null;

  return {
    filings,
    data,
    chartData,
    filingMarkers,
    fredMarkers,
    markers,
    chartMarkers,
    rankedEvents,
    latestPrice,
    hasChartData: chartData.length > 0,
  };
}
