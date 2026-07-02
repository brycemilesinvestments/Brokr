import type { NormalizedBar, YahooChartResponse, YahooChartResult } from "@/lib/market/types";

function unixToUtcIso(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export function normalizeChartResult(result: YahooChartResult, symbol: string): NormalizedBar[] {
  const quote = result.indicators.quote[0];
  if (!quote) return [];

  const bars: NormalizedBar[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    const volume = quote.volume[i];

    if (open == null || high == null || low == null || close == null || volume == null) {
      continue;
    }

    bars.push({
      date: unixToUtcIso(result.timestamp[i]),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return bars.sort((a, b) => a.date.localeCompare(b.date));
}

export function parseYahooChartResponse(
  response: YahooChartResponse,
  symbol: string,
): { currency?: string; bars: NormalizedBar[] } {
  const result = response.chart.result?.[0];
  if (!result) {
    const err = response.chart.error;
    throw new Error(err?.description ?? "Malformed Yahoo chart response: missing result");
  }

  return {
    currency: result.meta.currency,
    bars: normalizeChartResult(result, symbol),
  };
}

export function toMarketHistory(
  symbol: string,
  bars: NormalizedBar[],
  currency?: string,
) {
  return {
    symbol: symbol.toUpperCase(),
    currency,
    quotes: bars.map((bar) => ({
      symbol: symbol.toUpperCase(),
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    })),
  };
}
