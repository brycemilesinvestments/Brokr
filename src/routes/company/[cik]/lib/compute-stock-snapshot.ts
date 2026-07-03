import type { MarketQuote } from "@/lib/market";

export type StockSnapshot = {
  lastPrice: number;
  changePercent: number;
};

export function computeStockSnapshot(quotes: MarketQuote[]): StockSnapshot | null {
  if (quotes.length === 0) return null;

  const lastPrice = quotes.at(-1)?.close;
  if (lastPrice == null || !Number.isFinite(lastPrice)) return null;

  const firstPrice = quotes[0]?.close;
  if (firstPrice == null || !Number.isFinite(firstPrice) || firstPrice === 0) {
    return { lastPrice, changePercent: 0 };
  }

  return {
    lastPrice,
    changePercent: ((lastPrice - firstPrice) / firstPrice) * 100,
  };
}
