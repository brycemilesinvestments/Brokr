import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import type { FilingMarker } from "../types";
import { snapToTradingDay } from "../utils/snap-to-trading-day";

export type DocumentTimelineChartRow = {
  date: string;
  close: number;
};

export function buildDocumentTimelineChartData(
  quotes: Array<{ date: string; close: number }>,
  filings: TimelineFiling[],
): {
  chartData: DocumentTimelineChartRow[];
  markers: FilingMarker[];
} {
  const sortedQuotes = quotes.toSorted((a, b) => a.date.localeCompare(b.date));
  const quoteDates = sortedQuotes.map((quote) => quote.date);
  const closeByDate = new Map(sortedQuotes.map((quote) => [quote.date, quote.close]));

  const chartData = sortedQuotes.map((quote) => ({
    date: quote.date,
    close: quote.close,
  }));

  const markers: FilingMarker[] = [];
  for (const filing of filings) {
    const snappedDate = snapToTradingDay(filing.filingDate, quoteDates);
    if (!snappedDate) continue;

    const close = closeByDate.get(snappedDate);
    if (close == null) continue;

    markers.push({
      filing,
      filingDate: filing.filingDate,
      snappedDate,
      close,
    });
  }

  markers.sort((a, b) => a.snappedDate.localeCompare(b.snappedDate));

  return { chartData, markers };
}
