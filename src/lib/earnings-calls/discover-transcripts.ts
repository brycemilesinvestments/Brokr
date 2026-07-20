import { discoverTranscriptsFromIr } from "@/lib/earnings-calls/discover-from-ir";
import { discoverTranscriptsFromSec } from "@/lib/earnings-calls/discover-from-sec";
import { resolveInvestorWebsite } from "@/lib/earnings-calls/resolve-investor-website";
import type { DiscoverTranscriptsInput, TranscriptCandidate } from "@/lib/earnings-calls/types";

function dedupeCandidates(candidates: TranscriptCandidate[]): TranscriptCandidate[] {
  const byUrl = new Map<string, TranscriptCandidate>();

  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.sourceUrl);
    if (!existing || candidate.score > existing.score) {
      byUrl.set(candidate.sourceUrl, candidate);
    }
  }

  return [...byUrl.values()].sort((a, b) => {
    const dateCmp = (b.eventDate ?? "").localeCompare(a.eventDate ?? "");
    if (dateCmp !== 0) return dateCmp;
    return b.score - a.score;
  });
}

/**
 * Discover transcript URLs from SEC earnings exhibits and company IR pages.
 */
export async function discoverTranscriptCandidates(
  input: DiscoverTranscriptsInput,
): Promise<TranscriptCandidate[]> {
  const limit = input.limit ?? 20;
  const secLimit = Math.min(limit, 12);

  const [secCandidates, irResolution] = await Promise.all([
    discoverTranscriptsFromSec(input.cik, input.filings, secLimit),
    input.investorWebsite !== undefined || input.website !== undefined
      ? Promise.resolve({
          preferredIrBase: input.investorWebsite ?? input.website ?? null,
        })
      : resolveInvestorWebsite(input.cik).then((resolution) => ({
          preferredIrBase: resolution.preferredIrBase,
        })),
  ]);

  let irCandidates: TranscriptCandidate[] = [];
  if (irResolution.preferredIrBase) {
    irCandidates = await discoverTranscriptsFromIr(irResolution.preferredIrBase, limit);
  }

  return dedupeCandidates([...secCandidates, ...irCandidates]).slice(0, limit);
}
