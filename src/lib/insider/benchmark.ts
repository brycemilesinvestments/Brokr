import type { MarketQuote } from "@/lib/market";
import type { EventWindow } from "@/lib/insider/types";
import {
  computeWindowReturn,
  expectedReturnPriceDates,
  sortedUniqueDates,
  toPriceBars,
  type PriceBar,
} from "@/lib/insider/abnormal";

const SECTOR_BENCHMARKS: Record<string, string> = {
  "3572": "XLK",
  Technology: "XLK",
  default: "SPY",
};

export function resolveBenchmarkSymbol(sector?: string, sic?: string): string {
  if (sic && SECTOR_BENCHMARKS[sic]) return SECTOR_BENCHMARKS[sic];
  if (sector && SECTOR_BENCHMARKS[sector]) return SECTOR_BENCHMARKS[sector];
  return SECTOR_BENCHMARKS.default;
}

function cumulativeReturn(
  bars: PriceBar[],
  startIndex: number,
  endIndex: number,
): number | null {
  if (startIndex < 0 || endIndex >= bars.length || startIndex > endIndex) {
    return null;
  }

  const startPrice = bars[startIndex].close;
  const endPrice = bars[endIndex].close;
  if (startPrice === 0) return null;

  return (endPrice - startPrice) / startPrice;
}

/** C9.4 — Benchmark expected return over the same post-filing window as the stock. */
export function computeBenchmarkReturn(
  benchmarkQuotes: MarketQuote[] | PriceBar[],
  eventDate: string,
  window: EventWindow,
): number | null {
  const bars = toPriceBars(benchmarkQuotes);
  return computeWindowReturn(bars, eventDate, window);
}

export function benchmarkExpectedReturnDates(
  benchmarkQuotes: MarketQuote[] | PriceBar[],
  eventDate: string,
  window: EventWindow,
): string[] {
  const bars = toPriceBars(benchmarkQuotes);
  return expectedReturnPriceDates(eventDate, window, sortedUniqueDates(bars));
}
