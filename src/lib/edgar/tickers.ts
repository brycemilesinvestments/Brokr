import {
  SEC_COMPANY_TICKERS_URL,
  SEC_USER_AGENT,
} from "@/lib/edgar/constants";
import type { CompanyTicker } from "@/lib/edgar/types";

type SecTickerEntry = {
  cik_str: number;
  ticker: string;
  title: string;
};

let cachedTickers: CompanyTicker[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

async function fetchTickersFromSec(): Promise<CompanyTicker[]> {
  const response = await fetch(SEC_COMPANY_TICKERS_URL, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`Failed to load SEC company tickers (${response.status})`);
  }

  const data = (await response.json()) as Record<string, SecTickerEntry>;

  return Object.values(data).map((entry) => ({
    cik: entry.cik_str,
    ticker: entry.ticker,
    title: entry.title,
  }));
}

export async function getCompanyTickers(): Promise<CompanyTicker[]> {
  const now = Date.now();
  if (cachedTickers && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedTickers;
  }

  cachedTickers = await fetchTickersFromSec();
  cacheLoadedAt = now;
  return cachedTickers;
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}
