import {
  buildFilingDiffCacheKey,
  type FilingDiffCache,
  type FilingDiffCacheKey,
  type ProseDiffResult,
} from "@/lib/filing-diff";
import type { GuidanceCache, GuidanceCacheRecord } from "@/lib/guidance";

/** Process-local filing diff prose cache (persists for dev server lifetime). */
function createFilingDiffCache(): FilingDiffCache {
  const store = new Map<string, ProseDiffResult>();
  return {
    async read(key: FilingDiffCacheKey) {
      return store.get(buildFilingDiffCacheKey(key)) ?? null;
    },
    async write(key: FilingDiffCacheKey, value: ProseDiffResult) {
      store.set(buildFilingDiffCacheKey(key), value);
    },
  };
}

/** Process-local guidance extraction cache. */
function createGuidanceCache(): GuidanceCache {
  const store = new Map<string, GuidanceCacheRecord>();
  const cacheKey = (cik: string, accession: string) => `${cik}:${accession}`;

  return {
    async read(cik, accessionNumber) {
      return store.get(cacheKey(cik, accessionNumber)) ?? null;
    },
    async write(cik, accessionNumber, record) {
      store.set(cacheKey(cik, accessionNumber), record);
    },
  };
}

const filingDiffCache = createFilingDiffCache();
const guidanceCache = createGuidanceCache();

export function getFilingDiffCache(): FilingDiffCache {
  return filingDiffCache;
}

export function getGuidanceCache(): GuidanceCache {
  return guidanceCache;
}
