import type { StockHistoryResponse } from "../types";

const stockHistoryPromises = new Map<string, Promise<StockHistoryResponse>>();

export function loadStockHistory(cik: string, period1: number, period2: number) {
  const key = `${cik}:${period1}:${period2}`;
  let promise = stockHistoryPromises.get(key);
  if (!promise) {
    promise = fetch(`/api/company/${cik}/stock-history?from=${period1}&to=${period2}`)
      .then(async (response) => {
        const payload = (await response.json()) as StockHistoryResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load stock history");
        }
        return payload;
      })
      .catch((error) => {
        stockHistoryPromises.delete(key);
        throw error;
      });
    stockHistoryPromises.set(key, promise);
  }
  return promise;
}

function clearStockHistoryCache(cik?: string) {
  if (!cik) {
    stockHistoryPromises.clear();
    return;
  }
  for (const key of stockHistoryPromises.keys()) {
    if (key.startsWith(`${cik}:`)) {
      stockHistoryPromises.delete(key);
    }
  }
}
