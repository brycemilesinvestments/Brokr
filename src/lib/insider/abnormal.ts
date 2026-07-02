import type { MarketQuote } from "@/lib/market";
import type { AbnormalReturn, EventWindow } from "@/lib/insider/types";

export type PriceBar = { date: string; close: number };

export function toPriceBars(quotes: MarketQuote[] | PriceBar[]): PriceBar[] {
  return quotes.map((quote) =>
    "symbol" in quote
      ? { date: quote.date, close: quote.close }
      : { date: quote.date, close: quote.close },
  );
}

export function sortedUniqueDates(bars: PriceBar[]): string[] {
  return [...new Set(bars.map((bar) => bar.date))].sort();
}

/** Last trading day on or before the filing date (t=0). */
function findEventIndex(dates: string[], eventDate: string): number {
  let index = -1;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] <= eventDate) {
      index = i;
      continue;
    }
    break;
  }
  return index;
}

function getTradingDayOffsets(
  bars: PriceBar[],
  eventDate: string,
  window: EventWindow,
): { startIndex: number; endIndex: number; t0Index: number } | null {
  const dates = sortedUniqueDates(bars);
  const t0Index = findEventIndex(dates, eventDate);
  if (t0Index < 0) return null;

  const startCalendarIndex = t0Index + window.startOffsetDays;
  const endCalendarIndex = t0Index + window.endOffsetDays;
  if (
    startCalendarIndex >= dates.length ||
    endCalendarIndex >= dates.length ||
    startCalendarIndex > endCalendarIndex
  ) {
    return null;
  }

  const startDate = dates[startCalendarIndex];
  const endDate = dates[endCalendarIndex];
  const startIndex = bars.findIndex((bar) => bar.date === startDate);
  const endIndex = bars.findIndex((bar) => bar.date === endDate);
  if (startIndex < 0 || endIndex < 0) return null;

  return { startIndex, endIndex, t0Index };
}

export function computeWindowReturn(
  bars: PriceBar[],
  eventDate: string,
  window: EventWindow,
): number | null {
  const offsets = getTradingDayOffsets(bars, eventDate, window);
  if (!offsets) return null;

  const startPrice = bars[offsets.startIndex].close;
  const endPrice = bars[offsets.endIndex].close;
  if (startPrice === 0) return null;

  return (endPrice - startPrice) / startPrice;
}

export function computeAbnormalReturn(
  stockQuotes: MarketQuote[] | PriceBar[],
  benchmarkQuotes: MarketQuote[] | PriceBar[],
  filingDate: string,
  window: EventWindow,
): AbnormalReturn | null {
  const stockBars = toPriceBars(stockQuotes);
  const benchmarkByDate = new Map(
    toPriceBars(benchmarkQuotes).map((bar) => [bar.date, bar.close]),
  );
  const dates = sortedUniqueDates(stockBars);
  const t0Index = findEventIndex(dates, filingDate);
  if (t0Index < 0) return null;

  const startCalendarIndex = t0Index + window.startOffsetDays;
  const endCalendarIndex = t0Index + window.endOffsetDays;
  if (endCalendarIndex >= dates.length) return null;

  const startDate = dates[startCalendarIndex];
  const endDate = dates[endCalendarIndex];
  const stockStart = stockBars.find((bar) => bar.date === startDate)?.close;
  const stockEnd = stockBars.find((bar) => bar.date === endDate)?.close;
  const benchmarkStart = benchmarkByDate.get(startDate);
  const benchmarkEnd = benchmarkByDate.get(endDate);

  if (
    stockStart == null ||
    stockEnd == null ||
    benchmarkStart == null ||
    benchmarkEnd == null ||
    stockStart === 0 ||
    benchmarkStart === 0
  ) {
    return null;
  }

  const stockReturn = (stockEnd - stockStart) / stockStart;
  const benchmarkReturn = (benchmarkEnd - benchmarkStart) / benchmarkStart;
  const abnormalReturn = stockReturn - benchmarkReturn;

  return {
    eventDate: filingDate,
    filingDate,
    window,
    stockReturn,
    benchmarkReturn,
    abnormalReturn,
    cumulativeAbnormalReturn: abnormalReturn,
  };
}

/** C9.8 — Expected-return inputs must not reference prices beyond t+window end. */
export function assertNoLookAheadAtT0(
  pricesUsed: string[],
  eventDate: string,
  window: EventWindow,
  tradingDates: string[],
): boolean {
  const t0Index = findEventIndex(tradingDates, eventDate);
  if (t0Index < 0) return false;

  const maxAllowedIndex = t0Index + window.endOffsetDays;
  return pricesUsed.every((date) => {
    const index = tradingDates.indexOf(date);
    return index >= 0 && index <= maxAllowedIndex;
  });
}

/** Dates referenced when computing benchmark expected return for a post-filing window. */
export function expectedReturnPriceDates(
  eventDate: string,
  window: EventWindow,
  tradingDates: string[],
): string[] {
  const t0Index = findEventIndex(tradingDates, eventDate);
  if (t0Index < 0) return [];

  const startIndex = t0Index + window.startOffsetDays;
  const endIndex = t0Index + window.endOffsetDays;
  if (endIndex >= tradingDates.length) return [];

  return tradingDates.slice(startIndex, endIndex + 1);
}
