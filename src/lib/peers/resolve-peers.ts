import { formatCik } from "@/lib/edgar/constants";
import { isFilingWithinMonths, RECENT_FILING_MONTHS } from "@/lib/peers/recent-filing";
import type { PeerEntry, PeerResolveDeps, PeerSet } from "@/lib/peers/types";

const MIN_PEERS = 2;
export const MIN_PEER_COUNT = MIN_PEERS;
const DEFAULT_MAX_PEERS = 5;
const SIC_CANDIDATE_POOL = 40;
const YAHOO_CANDIDATE_POOL = 10;

async function resolveYahooPeers(
  input: ResolvePeersInput,
  deps: PeerResolveDeps,
  targetCikNorm: string,
  resolvedCiks: Set<string>,
  manualPeerCount: number,
  maxPeers: number,
): Promise<PeerEntry[]> {
  const ticker = input.ticker?.trim().toUpperCase();
  if (
    !ticker ||
    !deps.fetchComparePeersByTicker ||
    !deps.resolveTickerToCompany ||
    manualPeerCount >= MIN_PEERS ||
    manualPeerCount >= maxPeers
  ) {
    return [];
  }

  const resolveTickerToCompany = deps.resolveTickerToCompany;
  const recommendations = await deps.fetchComparePeersByTicker(ticker);
  const remaining = maxPeers - manualPeerCount;
  const candidates = recommendations
    .slice(0, YAHOO_CANDIDATE_POOL)
    .filter((recommendation) => recommendation.ticker !== ticker);

  const companies = await Promise.all(
    candidates.map((recommendation) => resolveTickerToCompany(recommendation.ticker)),
  );

  const filingDates = await Promise.all(
    companies.map((company) => {
      if (!company) return Promise.resolve(null);
      const cik = formatCik(company.cik);
      if (cik === targetCikNorm || resolvedCiks.has(cik)) return Promise.resolve(null);
      return deps.fetchLastFilingDate(cik);
    }),
  );

  const yahooPeers: PeerEntry[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    if (yahooPeers.length >= remaining) break;

    const company = companies[index];
    if (!company) continue;

    const cik = formatCik(company.cik);
    if (cik === targetCikNorm || resolvedCiks.has(cik)) continue;

    const lastFiling = filingDates[index];
    if (!lastFiling || !isFilingWithinMonths(lastFiling, RECENT_FILING_MONTHS)) {
      continue;
    }

    yahooPeers.push({
      cik,
      entityName: company.entityName,
      selectionMethod: "yahoo",
    });
    resolvedCiks.add(cik);
  }

  return yahooPeers;
}

export type ResolvePeersInput = {
  targetCik: string;
  targetEntityName: string;
  /** Target ticker — enables Yahoo Finance compare suggestions before SIC discovery. */
  ticker?: string;
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
  const eligible = candidates.filter((candidate) => {
    const cik = formatCik(candidate.cik);
    return !excludeCiks.has(cik);
  });

  const filingDates = await Promise.all(
    eligible.map((candidate) => deps.fetchLastFilingDate(formatCik(candidate.cik))),
  );

  const active: PeerEntry[] = [];
  for (let index = 0; index < eligible.length && active.length < limit; index += 1) {
    const candidate = eligible[index];
    const cik = formatCik(candidate.cik);
    const lastFiling = filingDates[index];
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
 *   1. Explicit manualPeerCiks (method = "manual").
 *   2. Yahoo Finance compare suggestions when ticker is known (method = "yahoo").
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

  const [sic, yahooPeers] = await Promise.all([
    deps.fetchSic(input.targetCik),
    resolveYahooPeers(
      input,
      deps,
      targetCikNorm,
      resolvedCiks,
      manualPeers.length,
      maxPeers,
    ),
  ]);

  const peersBeforeSic = [...manualPeers, ...yahooPeers];

  let sicPeers: PeerEntry[] = [];
  if (sic && peersBeforeSic.length < MIN_PEERS && peersBeforeSic.length < maxPeers) {
    const candidates = await deps.fetchCompaniesBySic(sic);
    const remaining = maxPeers - peersBeforeSic.length;

    sicPeers = await filterActiveSicCandidates(
      candidates.slice(0, SIC_CANDIDATE_POOL),
      deps,
      new Set([targetCikNorm, ...resolvedCiks]),
      remaining,
    );

    sicPeers = sicPeers.map((peer) => ({ ...peer, sic }));
  }

  const peers = [...manualPeers, ...yahooPeers, ...sicPeers];

  return {
    targetCik: targetCikNorm,
    targetEntityName: input.targetEntityName,
    sic: sic ?? undefined,
    peers,
    status: peers.length >= MIN_PEERS ? "ok" : "insufficient_peers",
  };
}
