import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FRED_OBSERVATION_START } from "./constants";
import type { FredObservationRow, FredSeriesRow } from "./types";

export type FredSeriesObservationsPayload = {
  series: FredSeriesRow;
  observations: FredObservationRow[];
  from: string;
  to: string;
};

function createFredReadClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingFredTable(errorMessage: string): boolean {
  return errorMessage.includes("fred_series") || errorMessage.includes("schema cache");
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchFredSeriesObservations(
  seriesId: string,
  from = FRED_OBSERVATION_START,
  to = defaultToDate(),
): Promise<FredSeriesObservationsPayload | null> {
  const supabase = createFredReadClient();
  if (!supabase) return null;

  const { data: series, error: seriesError } = await supabase
    .from("fred_series")
    .select("series_id, name, category, description, frequency, units")
    .eq("series_id", seriesId)
    .maybeSingle();

  if (seriesError) {
    if (isMissingFredTable(seriesError.message)) return null;
    throw new Error(`Failed to load FRED series ${seriesId}: ${seriesError.message}`);
  }

  if (!series) return null;

  const { data: observations, error: observationsError } = await supabase
    .from("fred_observations")
    .select("series_id, observation_date, value")
    .eq("series_id", seriesId)
    .gte("observation_date", from)
    .lte("observation_date", to)
    .order("observation_date", { ascending: true });

  if (observationsError) {
    if (isMissingFredTable(observationsError.message)) return null;
    throw new Error(
      `Failed to load FRED observations for ${seriesId}: ${observationsError.message}`,
    );
  }

  return {
    series,
    observations: observations ?? [],
    from,
    to,
  };
}

export async function fetchFredSeriesCatalog(): Promise<FredSeriesRow[]> {
  const supabase = createFredReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("fred_series")
    .select("series_id, name, category, description, frequency, units")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isMissingFredTable(error.message)) return [];
    throw new Error(`Failed to load FRED series catalog: ${error.message}`);
  }

  return data ?? [];
}
