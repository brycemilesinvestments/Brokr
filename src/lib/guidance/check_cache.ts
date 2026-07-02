import type { CheckCacheResult, GuidanceCache } from "@/lib/guidance/types";

/**
 * G3 — Resolve existing guidance extraction from cache.
 */
export async function check_cache(
  cache: GuidanceCache,
  cik: string,
  accessionNumber: string,
): Promise<CheckCacheResult> {
  const record = await cache.read(cik, accessionNumber);
  return {
    cacheHit: record !== null,
    record,
  };
}
