import type { GuidanceCache, GuidanceCacheRecord, GuidanceExtraction } from "@/lib/guidance/types";

/**
 * G5 — Persist extracted guidance for future cache hits.
 */
export async function write_cache(
  cache: GuidanceCache,
  cik: string,
  accessionNumber: string,
  guidance: GuidanceExtraction,
): Promise<GuidanceCacheRecord> {
  const record: GuidanceCacheRecord = {
    cik,
    accessionNumber,
    extractedAt: new Date().toISOString(),
    guidance,
  };

  await cache.write(cik, accessionNumber, record);
  return record;
}
