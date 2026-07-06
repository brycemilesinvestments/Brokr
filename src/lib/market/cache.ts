import type { MarketCacheEntry } from "@/lib/market/types";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function cacheKey(symbol: string, period1: number, period2: number): string {
  return `${symbol.toUpperCase()}:${period1}:${period2}`;
}

export function isCacheValid<T>(
  entry: MarketCacheEntry<T> | undefined,
  nowIso: string,
): entry is MarketCacheEntry<T> {
  if (!entry) return false;
  return entry.expiresAt > nowIso;
}

function createCacheEntry<T>(
  key: string,
  data: T,
  fetchedAtIso: string,
  ttlMs: number = DEFAULT_TTL_MS,
): MarketCacheEntry<T> {
  const fetchedAt = new Date(fetchedAtIso);
  const expiresAt = new Date(fetchedAt.getTime() + ttlMs).toISOString();
  return { key, data, fetchedAt: fetchedAtIso, expiresAt };
}

export class MarketCache {
  private store = new Map<string, MarketCacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get<T>(key: string, nowIso: string): T | undefined {
    const entry = this.store.get(key) as MarketCacheEntry<T> | undefined;
    if (!isCacheValid(entry, nowIso)) {
      if (entry) this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, fetchedAtIso: string): MarketCacheEntry<T> {
    const entry = createCacheEntry(key, data, fetchedAtIso, this.ttlMs);
    this.store.set(key, entry);
    return entry;
  }

  clear(): void {
    this.store.clear();
  }
}

