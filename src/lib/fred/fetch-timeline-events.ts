import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildFredTimelineEvents } from "./build-timeline-events";
import type { FredTimelineResponse } from "./types";

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

export async function fetchFredTimelineEvents(
  from: string,
  to: string,
): Promise<FredTimelineResponse> {
  const supabase = createFredReadClient();
  if (!supabase) {
    return { events: [], from, to, seriesCount: 0 };
  }

  const { data: seriesRows, error: seriesError } = await supabase.from("fred_series").select(
    "series_id, name, category, description, frequency, units",
  );

  if (seriesError) {
    if (isMissingFredTable(seriesError.message)) {
      return { events: [], from, to, seriesCount: 0 };
    }
    throw new Error(`Failed to load FRED series: ${seriesError.message}`);
  }

  if (!seriesRows?.length) {
    return { events: [], from, to, seriesCount: 0 };
  }

  const seriesById = new Map(seriesRows.map((row) => [row.series_id, row]));
  const observationBatches = await Promise.all(
    seriesRows.map(async (series) => {
      const { data, error } = await supabase
        .from("fred_observations")
        .select("series_id, observation_date, value")
        .eq("series_id", series.series_id)
        .gte("observation_date", from)
        .lte("observation_date", to)
        .order("observation_date", { ascending: true });

      if (error) {
        if (isMissingFredTable(error.message)) return [];
        throw new Error(`Failed to load FRED observations for ${series.series_id}: ${error.message}`);
      }

      return data ?? [];
    }),
  );

  const observations = observationBatches.flat();
  const events = buildFredTimelineEvents(seriesById, observations);

  return {
    events,
    from,
    to,
    seriesCount: seriesRows.length,
  };
}
