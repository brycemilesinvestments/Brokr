import { formatCik } from "@/lib/edgar/constants";
import { getCuratedPeers } from "@/lib/peers/curated-peers";
import { isFilingWithinMonths, RECENT_FILING_MONTHS } from "@/lib/peers/recent-filing";
import type { PeerEntry, PeerResolveDeps, PeerSet } from "@/lib/peers/types";

const MIN_PEERS = 2;
const DEFAULT_MAX_PEERS = 5;
const SIC_CANDIDATE_POOL = 40;

export type ResolvePeersInput = {
  targetCik: string;
  targetEntityName: string;
  /** Explicit peer CIKs that override/supplement SIC discovery. */
  manualPeerCiks?: string[];
  maxPeers?: number;
};

async function filterActiveSicCandidates(
  candidates: Array<{ cik: string; entityName: string }>,
  deps: PeerResolveDeps,
  excludeCiks: Set<string>,
  limit: number,
): Promise<PeerEntry[]> {
  const active: PeerEntry[] = [];

  for (const candidate of candidates) {
    if (active.length >= limit) break;

    const cik = formatCik(candidate.cik);
    if (excludeCiks.has(cik)) continue;

    const lastFiling = await deps.fetchLastFilingDate(cik);
    if (!lastFiling || !isFilingWithinMonths(lastFiling, RECENT_FILING_MONTHS)) {
      continue;
    }

    active.push({
      cik,
      entityName: candidate.entityName,
      selectionMethod: "sic",
    });
    excludeCiks.add(cik);
  }

  return active;
}

/**
 * P1: Resolve a peer set for the target company.
 *
 * Strategy:
 *   1. Curated peer list for known targets (method = "manual").
 *   2. Explicit manualPeerCiks (method = "manual").
 *   3. Fetch target's SIC code via deps.fetchSic.
 *   4. Fetch companies sharing that SIC via deps.fetchCompaniesBySic.
 *   5. Keep only SIC candidates with a filing in the last 24 months.
 *   6. Exclude the target itself and already-added peers.
 *   7. Fill up to maxPeers using active SIC candidates (method = "sic").
 *   8. Report INSUFFICIENT_PEERS if fewer than MIN_PEERS resolved.
 */
export async function resolvePeers(
  input: ResolvePeersInput,
  deps: PeerResolveDeps,
): Promise<PeerSet> {
  const targetCikNorm = formatCik(input.targetCik);
  const maxPeers = input.maxPeers ?? DEFAULT_MAX_PEERS;
  const resolvedCiks = new Set<string>();

  const manualPeers: PeerEntry[] = [];

  for (const curated of getCuratedPeers(targetCikNorm)) {
    const cik = formatCik(curated.cik);
    if (cik === targetCikNorm || resolvedCiks.has(cik)) continue;
    manualPeers.push({
      cik,
      entityName: curated.entityName,
      selectionMethod: "manual",
    });
    resolvedCiks.add(cik);
  }

  if (input.manualPeerCiks) {
    for (const rawCik of input.manualPeerCiks) {
      const cik = formatCik(rawCik);
      if (cik === targetCikNorm || resolvedCiks.has(cik)) continue;
      manualPeers.push({
        cik,
        entityName: cik,
        selectionMethod: "manual",
      });
      resolvedCiks.add(cik);
    }
  }

  const sic = await deps.fetchSic(input.targetCik);

  let sicPeers: PeerEntry[] = [];
  if (sic && manualPeers.length < MIN_PEERS && manualPeers.length < maxPeers) {
    const candidates = await deps.fetchCompaniesBySic(sic);
    const remaining = maxPeers - manualPeers.length;

    sicPeers = await filterActiveSicCandidates(
      candidates.slice(0, SIC_CANDIDATE_POOL),
      deps,
      new Set([targetCikNorm, ...resolvedCiks]),
      remaining,
    );

    sicPeers = sicPeers.map((peer) => ({ ...peer, sic }));
  }

  const peers = [...manualPeers, ...sicPeers];

  return {
    targetCik: targetCikNorm,
    targetEntityName: input.targetEntityName,
    sic: sic ?? undefined,
    peers,
    status: peers.length >= MIN_PEERS ? "ok" : "insufficient_peers",
  };
}
