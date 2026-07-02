import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRED_TARGET_SERIES } from "./target-series";
import type { FredStatus } from "./types";

function getFredApiKey(): string | undefined {
  return (
    process.env.FRED_API_KEY ??
    process.env.FRED_KEY ??
    process.env.FRED_STLOUIS_API_KEY
  );
}

function isMissingFredTable(errorMessage: string): boolean {
  return errorMessage.includes("fred_") || errorMessage.includes("schema cache");
}

async function checkFredSchema(
  supabase: SupabaseClient,
): Promise<{ ready: boolean; error?: string }> {
  const tables = ["fred_series", "fred_observations", "fred_ingestion_state"] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      if (isMissingFredTable(error.message)) {
        return {
          ready: false,
          error: `Table ${table} is missing. Apply the FRED migration or run npm run setup-fred-schema.`,
        };
      }
      return { ready: false, error: error.message };
    }
  }

  return { ready: true };
}

export async function fetchFredStatus(): Promise<FredStatus> {
  const supabase = createAdminClient();
  const fredApiKeyConfigured = Boolean(getFredApiKey());

  if (!supabase) {
    return {
      schemaReady: false,
      schemaError: "Supabase admin client is not configured.",
      targetSeriesCount: FRED_TARGET_SERIES.length,
      seriesCount: 0,
      observationCount: 0,
      latestObservationDate: null,
      completedSeriesCount: 0,
      failedSeries: [],
      inProgressSeries: null,
      lastIngestedAt: null,
      fredApiKeyConfigured,
    };
  }

  const schema = await checkFredSchema(supabase);
  if (!schema.ready) {
    return {
      schemaReady: false,
      schemaError: schema.error,
      targetSeriesCount: FRED_TARGET_SERIES.length,
      seriesCount: 0,
      observationCount: 0,
      latestObservationDate: null,
      completedSeriesCount: 0,
      failedSeries: [],
      inProgressSeries: null,
      lastIngestedAt: null,
      fredApiKeyConfigured,
    };
  }

  const [
    { count: seriesCount, error: seriesError },
    { count: observationCount, error: observationError },
    { data: latestRow, error: latestError },
    { data: stateRow, error: stateError },
  ] = await Promise.all([
    supabase.from("fred_series").select("*", { count: "exact", head: true }),
    supabase.from("fred_observations").select("*", { count: "exact", head: true }),
    supabase
      .from("fred_observations")
      .select("observation_date")
      .order("observation_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fred_ingestion_state")
      .select("completed, failed, in_progress, last_updated_at")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (seriesError || observationError || latestError || stateError) {
    const message =
      seriesError?.message ??
      observationError?.message ??
      latestError?.message ??
      stateError?.message ??
      "Failed to load FRED status";
    return {
      schemaReady: false,
      schemaError: message,
      targetSeriesCount: FRED_TARGET_SERIES.length,
      seriesCount: 0,
      observationCount: 0,
      latestObservationDate: null,
      completedSeriesCount: 0,
      failedSeries: [],
      inProgressSeries: null,
      lastIngestedAt: null,
      fredApiKeyConfigured,
    };
  }

  return {
    schemaReady: true,
    targetSeriesCount: FRED_TARGET_SERIES.length,
    seriesCount: seriesCount ?? 0,
    observationCount: observationCount ?? 0,
    latestObservationDate: latestRow?.observation_date ?? null,
    completedSeriesCount: stateRow?.completed?.length ?? 0,
    failedSeries: stateRow?.failed ?? [],
    inProgressSeries: stateRow?.in_progress ?? null,
    lastIngestedAt: stateRow?.last_updated_at ?? null,
    fredApiKeyConfigured,
  };
}
