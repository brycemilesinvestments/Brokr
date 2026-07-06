export { MarketClient, createMarketClient } from "@/lib/market/client";
export type { MarketClientOptions } from "@/lib/market/client";

export {
  MarketCache,
  cacheKey,
  isCacheValid,
} from "@/lib/market/cache";

export {
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
