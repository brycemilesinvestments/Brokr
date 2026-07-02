import { MarketCache, cacheKey } from "@/lib/market/cache";
import { parseYahooChartResponse, toMarketHistory } from "@/lib/market/normalize";
import type { MarketHistory, YahooChartResponse } from "@/lib/market/types";

export type MarketClientOptions = {
  fetchFn?: typeof fetch;
  cache?: MarketCache;
  now?: () => string;
};

function defaultNow(): string {
  return new Date().toISOString();
}

function yahooChartUrl(symbol: string, period1: number, period2: number): string {
  const params = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
    includePrePost: "false",
  });
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
}

export class MarketClient {
  private fetchFn: typeof fetch;
  private cache: MarketCache;
  private now: () => string;

  constructor(options: MarketClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.cache = options.cache ?? new MarketCache();
    this.now = options.now ?? defaultNow;
  }

  async getHistory(
    symbol: string,
    period1: number,
    period2: number,
    options: { useCache?: boolean } = {},
  ): Promise<MarketHistory> {
    const useCache = options.useCache !== false;
    const key = cacheKey(symbol, period1, period2);
    const nowIso = this.now();

    if (useCache) {
      const cached = this.cache.get<MarketHistory>(key, nowIso);
      if (cached) return cached;
    }

    const url = yahooChartUrl(symbol, period1, period2);
    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new Error(`Yahoo chart request failed (${response.status})`);
    }

    const json = (await response.json()) as YahooChartResponse;
    const { currency, bars } = parseYahooChartResponse(json, symbol);
    const history = toMarketHistory(symbol, bars, currency);

    if (useCache) {
      this.cache.set(key, history, nowIso);
    }

    return history;
  }
}

export function createMarketClient(options?: MarketClientOptions): MarketClient {
  return new MarketClient(options);
}
