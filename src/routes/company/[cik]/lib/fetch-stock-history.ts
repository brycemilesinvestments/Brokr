import { resolveCompanyByCik } from "@/lib/edgar/resolve-company";
import { createMarketClient, type MarketQuote } from "@/lib/market";

export type StockHistoryPayload = {
  ticker: string;
  currency?: string;
  quotes: MarketQuote[];
};

export async function fetchStockHistory(
  cik: string,
  options: { period1: number; period2: number },
): Promise<StockHistoryPayload | null> {
  const company = await resolveCompanyByCik(cik);
  const ticker = company?.ticker?.trim();
  if (!ticker) return null;

  const market = createMarketClient();
  const history = await market.getHistory(ticker, options.period1, options.period2);

  return {
    ticker,
    currency: history.currency,
    quotes: history.quotes,
  };
}
