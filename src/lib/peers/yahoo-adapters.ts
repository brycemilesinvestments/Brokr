import { formatCik } from "@/lib/edgar/constants";
import { getCompanyTickers } from "@/lib/edgar/tickers";

export type YahooComparePeer = {
  ticker: string;
  score: number;
};

type YahooRecommendationsResponse = {
  finance?: {
    result?: Array<{
      symbol?: string;
      recommendedSymbols?: Array<{
        symbol?: string;
        score?: number;
      }>;
    }>;
  };
};

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (compatible; Brokr/1.0; +https://github.com/brycemiles/Brokr)";

function yahooRecommendationsUrl(symbol: string): string {
  return `https://query2.finance.yahoo.com/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`;
}

/**
 * Fetch Yahoo Finance "Compare" peer suggestions for a ticker.
 * Uses the same v6 endpoint that powers Yahoo's quote-page compare carousel.
 */
export async function fetchComparePeersFromYahoo(
  ticker: string,
): Promise<YahooComparePeer[]> {
  const url = yahooRecommendationsUrl(ticker.trim().toUpperCase());
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as YahooRecommendationsResponse;
    const recommended = data.finance?.result?.[0]?.recommendedSymbols ?? [];

    return recommended
      .filter((item): item is { symbol: string; score: number } => {
        return typeof item.symbol === "string" && typeof item.score === "number";
      })
      .map((item) => ({
        ticker: item.symbol.toUpperCase(),
        score: item.score,
      }));
  } catch {
    return [];
  }
}

/**
 * Map a US ticker to SEC CIK + entity name via the SEC company tickers feed.
 */
export async function resolveTickerToCompanyFromSec(
  ticker: string,
): Promise<{ cik: string; entityName: string } | null> {
  const normalized = ticker.trim().toUpperCase();
  if (!normalized) return null;

  const tickers = await getCompanyTickers();
  const match = tickers.find((entry) => entry.ticker.toUpperCase() === normalized);
  if (!match) return null;

  return {
    cik: formatCik(match.cik),
    entityName: match.title,
  };
}
