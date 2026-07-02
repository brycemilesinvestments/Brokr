export type MarketQuote = {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketHistory = {
  symbol: string;
  currency?: string;
  quotes: MarketQuote[];
};

export type MarketCacheEntry<T> = {
  key: string;
  data: T;
  fetchedAt: string;
  expiresAt: string;
};

export type YahooChartMeta = {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
};

export type YahooChartResult = {
  meta: YahooChartMeta;
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume: (number | null)[];
    }>;
  };
};

export type YahooChartResponse = {
  chart: {
    result?: YahooChartResult[];
    error?: { code: string; description: string } | null;
  };
};

export type NormalizedBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
