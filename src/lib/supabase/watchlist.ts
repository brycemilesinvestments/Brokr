import { createClient } from "@/lib/supabase/server";

/** Minimal alert shape for persistence (avoids cross-chunk import). */
export type AlertRecord = {
  cik: string;
  type: string;
  eventKey: string;
};

// Raw DB row shapes (snake_case, matching the migration).
export type WatchlistRow = {
  id: string;
  cik: string;
  trigger_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AlertEventRow = {
  id: string;
  cik: string;
  alert_type: string;
  event_key: string;
  payload: Record<string, unknown>;
  fired_at: string;
};

// ── Watchlist CRUD ─────────────────────────────────────────────────────────────

/** Return all watchlist entries, optionally filtered to one CIK. */
export async function getWatchlistEntries(cik?: string): Promise<WatchlistRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const query = cik
    ? supabase.from("watchlists").select("*").eq("cik", cik)
    : supabase.from("watchlists").select("*");

  const { data } = await query;
  return (data ?? []) as WatchlistRow[];
}

/**
 * Create or replace a watchlist entry for the given CIK.
 * Uses INSERT … ON CONFLICT (cik) DO UPDATE so it is idempotent.
 */
export async function upsertWatchlistEntry(
  cik: string,
  triggerConfig: Record<string, unknown>,
): Promise<WatchlistRow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("watchlists")
    .upsert(
      { cik, trigger_config: triggerConfig, updated_at: new Date().toISOString() },
      { onConflict: "cik" },
    )
    .select()
    .single();

  if (error) return null;
  return data as WatchlistRow;
}

/** Remove a watchlist entry by CIK. Returns true when deletion succeeded. */
export async function deleteWatchlistEntry(cik: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("cik", cik);

  return !error;
}

// ── Alert event state (dedup + audit) ─────────────────────────────────────────

/**
 * Return all previously fired event keys for a CIK.
 * Pass sinceDate (ISO 8601) to limit the window; omit for the full history.
 */
export async function getFiredEventKeys(
  cik: string,
  sinceDate?: string,
): Promise<string[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const query = sinceDate
    ? supabase
        .from("alert_events")
        .select("event_key")
        .eq("cik", cik)
        .gte("fired_at", sinceDate)
    : supabase
        .from("alert_events")
        .select("event_key")
        .eq("cik", cik);

  const { data } = await query;
  return (data ?? []).map((row: { event_key: string }) => row.event_key);
}

/**
 * Load fired event keys for multiple CIKs into a single Set (dedup guard).
 * CIKs are processed in sorted order for determinism.
 */
export async function loadFiredEventKeys(ciks: string[]): Promise<Set<string>> {
  const sortedCiks = [...ciks].sort((a, b) => a.localeCompare(b));
  const keys = new Set<string>();

  for (const cik of sortedCiks) {
    const rows = await getFiredEventKeys(cik);
    for (const key of rows) {
      keys.add(key);
    }
  }

  return keys;
}

/**
 * Persist one fired alert event.
 * Idempotent: duplicate (cik, alert_type, event_key) rows are silently ignored
 * thanks to the unique index in the migration.
 */
export async function recordAlertEvent(
  cik: string,
  alertType: string,
  eventKey: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("alert_events")
    .insert({ cik, alert_type: alertType, event_key: eventKey, payload });

  // Postgres error code 23505 = unique_violation — expected for re-fires.
  if (error && error.code !== "23505") return false;

  return true;
}

/**
 * Persist all fired alerts from a poll. Idempotent per event_key.
 * Returns the number of successfully recorded events.
 */
export async function recordAlertEvents(alerts: AlertRecord[]): Promise<number> {
  let recorded = 0;
  for (const alert of alerts) {
    const ok = await recordAlertEvent(
      alert.cik,
      alert.type,
      alert.eventKey,
      alert as unknown as Record<string, unknown>,
    );
    if (ok) recorded++;
  }
  return recorded;
}
