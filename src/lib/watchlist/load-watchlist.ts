import type {
  TriggerConfig,
  WatchlistEntry,
  WatchlistStoreRow,
} from "@/lib/watchlist/types";

/**
 * W1 — Map raw Supabase rows to typed domain entries.
 *
 * - Converts snake_case column names to camelCase.
 * - Normalises malformed trigger_config to `{ triggers: [] }`.
 * - Sorts output deterministically by CIK so callers get a stable order.
 */
export function loadWatchlist(rows: WatchlistStoreRow[]): WatchlistEntry[] {
  const entries: WatchlistEntry[] = rows.map((row) => ({
    id: row.id,
    cik: row.cik,
    triggerConfig: parseTriggerConfig(row.trigger_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return entries.sort((a, b) => a.cik.localeCompare(b.cik));
}

function parseTriggerConfig(raw: Record<string, unknown>): TriggerConfig {
  if (Array.isArray(raw.triggers)) {
    return { triggers: raw.triggers as TriggerConfig["triggers"] };
  }
  return { triggers: [] };
}
