import type {
  FilingDiffCache,
  FilingDiffCacheKey,
  ProseDiffResult,
} from "@/lib/filing-diff/types";

/** F6 — Persist prose diff cache by accession pair. */
export async function writeDiffCache(
  cache: FilingDiffCache | undefined,
  key: FilingDiffCacheKey,
  prose: ProseDiffResult,
): Promise<void> {
  if (!cache) return;
  await cache.write(key, prose);
}
