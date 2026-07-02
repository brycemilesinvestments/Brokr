import type {
  FilingDiffCache,
  FilingDiffCacheKey,
  ProseDiffResult,
} from "@/lib/filing-diff/types";

export type DiffCacheCheckResult = {
  key: FilingDiffCacheKey;
  hit: boolean;
  prose: ProseDiffResult | null;
};

export function buildFilingDiffCacheKey(key: FilingDiffCacheKey): string {
  return `${key.cik}:${key.currentAccession}::${key.previousAccession}`;
}

/** F4 — Read diff cache before any paid prose diff call. */
export async function checkDiffCache(
  cache: FilingDiffCache | undefined,
  key: FilingDiffCacheKey,
): Promise<DiffCacheCheckResult> {
  if (!cache) {
    return { key, hit: false, prose: null };
  }
  const prose = await cache.read(key);
  return { key, hit: prose !== null, prose };
}
