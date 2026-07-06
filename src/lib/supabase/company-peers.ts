import { formatCik } from "@/lib/edgar/constants";
import type { PeerEntry, PeerSelectionMethod } from "@/lib/peers/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyByEdgarId, upsertCompanyProfile, type CompanyRow } from "@/lib/supabase/companies";

export const MIN_STORED_PEER_COUNT = 2;

export type StoredPeerRow = {
  cik: string;
  entityName: string;
  ticker: string | null;
  selectionMethod: PeerSelectionMethod;
  sortOrder: number;
  score: number | null;
};

type CompanyPeerJoinRow = {
  selection_method: string;
  sort_order: number;
  score: number | null;
  peer:
    | {
        edgar_id: string;
        name: string;
        ticker: string | null;
      }
    | {
        edgar_id: string;
        name: string;
        ticker: string | null;
      }[]
    | null;
};

function normalizePeerJoin(
  peer: CompanyPeerJoinRow["peer"],
): { edgar_id: string; name: string; ticker: string | null } | null {
  if (!peer) return null;
  if (Array.isArray(peer)) return peer[0] ?? null;
  return peer;
}

function mapStoredPeer(row: CompanyPeerJoinRow): StoredPeerRow | null {
  const peer = normalizePeerJoin(row.peer);
  if (!peer?.edgar_id) return null;

  const selectionMethod = row.selection_method as PeerSelectionMethod;
  if (selectionMethod !== "yahoo" && selectionMethod !== "sic" && selectionMethod !== "manual") {
    return null;
  }

  return {
    cik: formatCik(peer.edgar_id),
    entityName: peer.name,
    ticker: peer.ticker,
    selectionMethod,
    sortOrder: row.sort_order,
    score: row.score,
  };
}

export function storedPeersToPeerEntries(rows: StoredPeerRow[]): PeerEntry[] {
  return rows.map((row) => ({
    cik: row.cik,
    entityName: row.entityName,
    ticker: row.ticker ?? undefined,
    selectionMethod: row.selectionMethod,
  }));
}

export async function getStoredPeersForCik(sourceCik: string): Promise<StoredPeerRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const sourceCompany = await getCompanyByEdgarId(sourceCik);
  if (!sourceCompany) return [];

  const { data, error } = await supabase
    .from("company_peers")
    .select(
      "selection_method, sort_order, score, peer:companies!company_peers_peer_company_id_fkey(edgar_id, name, ticker)",
    )
    .eq("source_company_id", sourceCompany.id)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data
    .map((row) => mapStoredPeer(row as unknown as CompanyPeerJoinRow))
    .filter((row): row is StoredPeerRow => row !== null);
}

async function ensureCompanyRow(input: {
  edgarId: string;
  name: string;
  ticker?: string | null;
}): Promise<CompanyRow | null> {
  return upsertCompanyProfile({
    edgarId: input.edgarId,
    name: input.name,
    ticker: input.ticker ?? null,
  });
}

export async function replaceStoredPeersForCik(input: {
  sourceCik: string;
  sourceEntityName: string;
  sourceTicker?: string | null;
  peers: PeerEntry[];
  refreshSource: string;
}): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  const sourceCompany = await ensureCompanyRow({
    edgarId: input.sourceCik,
    name: input.sourceEntityName,
    ticker: input.sourceTicker ?? null,
  });
  if (!sourceCompany) return;

  const peerCompanyResults = await Promise.all(
    input.peers.map(async (peer, index) => {
      const peerCompany = await ensureCompanyRow({
        edgarId: peer.cik,
        name: peer.entityName,
      });
      if (!peerCompany) return null;

      return {
        peerCompanyId: peerCompany.id,
        peer,
        sortOrder: index,
      };
    }),
  );
  const peerCompanyIds = peerCompanyResults.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  );

  const { error: deleteError } = await supabase
    .from("company_peers")
    .delete()
    .eq("source_company_id", sourceCompany.id);

  if (deleteError) return;

  if (peerCompanyIds.length > 0) {
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("company_peers").insert(
      peerCompanyIds.map(({ peerCompanyId, peer, sortOrder }) => ({
        source_company_id: sourceCompany.id,
        peer_company_id: peerCompanyId,
        selection_method: peer.selectionMethod,
        sort_order: sortOrder,
        score: null,
        updated_at: now,
      })),
    );

    if (insertError) return;
  }

  await supabase.from("company_peer_refreshes").upsert(
    {
      source_company_id: sourceCompany.id,
      refreshed_at: new Date().toISOString(),
      refresh_source: input.refreshSource,
    },
    { onConflict: "source_company_id" },
  );
}
