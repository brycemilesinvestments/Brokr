export { MarketClient, createMarketClient, yahooChartUrl } from "@/lib/market/client";
export type { MarketClientOptions } from "@/lib/market/client";

export {
  MarketCache,
  cacheKey,
  isCacheValid,
  createCacheEntry,
  DEFAULT_TTL_MS,
} from "@/lib/market/cache";

export {
  normalizeChartResult,
  parseYahooChartResponse,
  toMarketHistory,
} from "@/lib/market/normalize";

export type {
  MarketQuote,
  MarketHistory,
  MarketCacheEntry,
  YahooChartMeta,
  YahooChartResult,
  YahooChartResponse,
  NormalizedBar,
} from "@/lib/market/types";
