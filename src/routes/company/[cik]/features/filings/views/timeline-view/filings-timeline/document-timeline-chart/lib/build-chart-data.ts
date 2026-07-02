import type { FredTimelineEvent } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import type { FredMarker, FilingMarker, TimelineMarker } from "../types";
import { snapToTradingDay } from "../utils/snap-to-trading-day";

export type DocumentTimelineChartRow = {
  date: string;
  close: number;
};

function buildFilingMarkers(
  filings: TimelineFiling[],
  quoteDates: string[],
  closeByDate: Map<string, number>,
): FilingMarker[] {
  const markers: FilingMarker[] = [];

  for (const filing of filings) {
    const snappedDate = snapToTradingDay(filing.filingDate, quoteDates);
    if (!snappedDate) continue;

    const close = closeByDate.get(snappedDate);
    if (close == null) continue;

    markers.push({
      kind: "filing",
      filing,
      eventDate: filing.filingDate,
      snappedDate,
      close,
    });
  }

  return markers;
}

function buildFredMarkers(
  events: FredTimelineEvent[],
  quoteDates: string[],
  closeByDate: Map<string, number>,
): FredMarker[] {
  const markers: FredMarker[] = [];

  for (const event of events) {
    const snappedDate = snapToTradingDay(event.observationDate, quoteDates);
    if (!snappedDate) continue;

    const close = closeByDate.get(snappedDate);
    if (close == null) continue;

    markers.push({
      kind: "fred",
      event,
      eventDate: event.observationDate,
      snappedDate,
      close,
    });
  }

  return markers;
}

export function buildDocumentTimelineChartData(
  quotes: Array<{ date: string; close: number }>,
  filings: TimelineFiling[],
  fredEvents: FredTimelineEvent[] = [],
): {
  chartData: DocumentTimelineChartRow[];
  filingMarkers: FilingMarker[];
  fredMarkers: FredMarker[];
  markers: TimelineMarker[];
} {
  const sortedQuotes = [...quotes].sort((a, b) => a.date.localeCompare(b.date));
  const quoteDates = sortedQuotes.map((quote) => quote.date);
  const closeByDate = new Map(sortedQuotes.map((quote) => [quote.date, quote.close]));

  const chartData = sortedQuotes.map((quote) => ({
    date: quote.date,
    close: quote.close,
  }));

  const filingMarkers = buildFilingMarkers(filings, quoteDates, closeByDate);
  const fredMarkers = buildFredMarkers(fredEvents, quoteDates, closeByDate);
  const markers = [...filingMarkers, ...fredMarkers].sort((a, b) =>
    a.snappedDate.localeCompare(b.snappedDate),
  );

  return { chartData, filingMarkers, fredMarkers, markers };
}
