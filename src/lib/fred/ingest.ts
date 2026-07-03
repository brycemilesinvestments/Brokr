import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRED_OBSERVATION_START } from "./constants";
import { fetchFredStatus } from "./fetch-status";
import { FRED_TARGET_SERIES, type FredSeriesTarget } from "./target-series";
import type { FredIngestResult } from "./types";

const FRED_BASE = "https://api.stlouisfed.org/fred";
const FRED_CSV_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const BATCH_SIZE = 500;
const INTER_SERIES_DELAY_MS = 600;
const RETRY_PASS_DELAY_MS = 10_000;
const MAX_RETRY_PASSES = 2;

type IngestionState = {
  completed: string[];
  failed: string[];
  in_progress: string | null;
};

type FredSeriesResponse = {
  seriess?: Array<{
    title?: string;
    frequency?: string;
    units?: string;
    seasonal_adjustment?: string;
    last_updated?: string;
  }>;
};

type FredObservationsResponse = {
  observations?: Array<{
    date: string;
    value: string;
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFredApiKey(): string | undefined {
  return (
    process.env.FRED_API_KEY ??
    process.env.FRED_KEY ??
    process.env.FRED_STLOUIS_API_KEY
  );
}

async function verifyFredSource(fredApiKey: string | null): Promise<void> {
  if (!fredApiKey) {
    const response = await fetch(`${FRED_CSV_BASE}?id=UNRATE`);
    if (!response.ok) {
      throw new Error(`FRED CSV check failed: HTTP ${response.status}`);
    }
    return;
  }

  const url = new URL(`${FRED_BASE}/series`);
  url.searchParams.set("series_id", "UNRATE");
  url.searchParams.set("api_key", fredApiKey);
  url.searchParams.set("file_type", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API check failed: HTTP ${response.status} ${response.statusText}`);
  }
}

async function loadOrInitState(supabase: SupabaseClient): Promise<IngestionState> {
  const { data, error } = await supabase
    .from("fred_ingestion_state")
    .select("completed, failed, in_progress")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load ingestion state: ${error.message}`);
  }

  if (data) {
    return {
      completed: data.completed ?? [],
      failed: data.failed ?? [],
      in_progress: data.in_progress ?? null,
    };
  }

  const { error: insertError } = await supabase.from("fred_ingestion_state").insert({
    id: 1,
    completed: [],
    failed: [],
    in_progress: null,
  });

  if (insertError) {
    throw new Error(`Failed to initialize ingestion state: ${insertError.message}`);
  }

  return { completed: [], failed: [], in_progress: null };
}

async function persistState(
  supabase: SupabaseClient,
  state: IngestionState,
): Promise<void> {
  const { error } = await supabase
    .from("fred_ingestion_state")
    .update({
      completed: state.completed,
      failed: state.failed,
      in_progress: state.in_progress,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw new Error(`Failed to persist ingestion state: ${error.message}`);
  }
}

async function fetchFredJson<T>(
  path: string,
  params: Record<string, string>,
  fredApiKey: string,
  retries: number,
  backoffMs: number[],
): Promise<T> {
  const url = new URL(`${FRED_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", fredApiKey);
  url.searchParams.set("file_type", "json");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (attempt > 0) {
      await sleep(backoffMs[attempt - 1] ?? 2000);
    }

    try {
      const response = await fetch(url);
      if (response.status === 429) {
        await sleep(30_000);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("FRED request failed");
}

async function fetchSeriesMetadata(
  target: FredSeriesTarget,
  fredApiKey: string | null,
): Promise<{
  title: string;
  frequency: string | null;
  units: string | null;
  seasonal_adjustment: string | null;
  last_updated: string | null;
}> {
  if (!fredApiKey) {
    return {
      title: target.description,
      frequency: null,
      units: null,
      seasonal_adjustment: null,
      last_updated: null,
    };
  }

  const data = await fetchFredJson<FredSeriesResponse>(
    "/series",
    { series_id: target.id },
    fredApiKey,
    3,
    [2000, 2000, 2000],
  );

  const series = data.seriess?.[0];
  if (!series?.title) {
    throw new Error("FRED series metadata missing title");
  }

  return {
    title: series.title,
    frequency: series.frequency ?? null,
    units: series.units ?? null,
    seasonal_adjustment: series.seasonal_adjustment ?? null,
    last_updated: series.last_updated ?? null,
  };
}

async function fetchObservationsFromCsv(
  seriesId: string,
): Promise<Array<{ observation_date: string; value: number }>> {
  const response = await fetch(`${FRED_CSV_BASE}?id=${encodeURIComponent(seriesId)}`);
  if (!response.ok) {
    throw new Error(`FRED CSV failed: HTTP ${response.status}`);
  }

  const text = await response.text();
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("FRED CSV returned no observations");
  }

  const rows: Array<{ observation_date: string; value: number }> = [];

  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(",");
    if (!date || !rawValue || rawValue === ".") continue;
    if (date < FRED_OBSERVATION_START) continue;

    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) continue;

    rows.push({ observation_date: date, value: parsed });
  }

  return rows;
}

async function fetchObservations(
  seriesId: string,
  fredApiKey: string | null,
): Promise<Array<{ observation_date: string; value: number }>> {
  if (!fredApiKey) {
    return fetchObservationsFromCsv(seriesId);
  }

  const data = await fetchFredJson<FredObservationsResponse>(
    "/series/observations",
    {
      series_id: seriesId,
      observation_start: FRED_OBSERVATION_START,
      sort_order: "asc",
    },
    fredApiKey,
    3,
    [2000, 4000, 8000],
  );

  const rows: Array<{ observation_date: string; value: number }> = [];

  for (const obs of data.observations ?? []) {
    if (obs.value === ".") continue;

    const parsed = Number.parseFloat(obs.value);
    if (!Number.isFinite(parsed)) continue;

    rows.push({ observation_date: obs.date, value: parsed });
  }

  return rows;
}

async function upsertSeries(
  supabase: SupabaseClient,
  target: FredSeriesTarget,
  metadata: Awaited<ReturnType<typeof fetchSeriesMetadata>>,
): Promise<void> {
  const { error } = await supabase.from("fred_series").upsert(
    {
      series_id: target.id,
      name: target.description,
      category: target.category,
      description: target.description,
      frequency: metadata.frequency,
      units: metadata.units,
      seasonal_adjustment: metadata.seasonal_adjustment,
      fred_title: metadata.title,
      last_updated: metadata.last_updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "series_id" },
  );

  if (error) {
    throw new Error(`fred_series upsert failed: ${error.message}`);
  }
}

async function upsertObservations(
  supabase: SupabaseClient,
  seriesId: string,
  observations: Array<{ observation_date: string; value: number }>,
): Promise<void> {
  for (let i = 0; i < observations.length; i += BATCH_SIZE) {
    const batch = observations.slice(i, i + BATCH_SIZE).map((row) => ({
      series_id: seriesId,
      observation_date: row.observation_date,
      value: row.value,
    }));

    const { error } = await supabase
      .from("fred_observations")
      .upsert(batch, { onConflict: "series_id,observation_date" });

    if (error) {
      throw new Error(`fred_observations upsert failed: ${error.message}`);
    }
  }
}

async function ingestSeries(
  supabase: SupabaseClient,
  target: FredSeriesTarget,
  fredApiKey: string | null,
  state: IngestionState,
): Promise<{ observationCount: number }> {
  state.in_progress = target.id;
  await persistState(supabase, state);

  const metadata = await fetchSeriesMetadata(target, fredApiKey);
  const observations = await fetchObservations(target.id, fredApiKey);

  await upsertSeries(supabase, target, metadata);
  await upsertObservations(supabase, target.id, observations);

  state.completed = [...new Set([...state.completed, target.id])];
  state.failed = state.failed.filter((id) => id !== target.id);
  state.in_progress = null;
  await persistState(supabase, state);

  return { observationCount: observations.length };
}

async function ingestSeriesSafe(
  supabase: SupabaseClient,
  target: FredSeriesTarget,
  fredApiKey: string | null,
  state: IngestionState,
): Promise<{ ok: true; observationCount: number } | { ok: false; reason: string }> {
  try {
    const result = await ingestSeries(supabase, target, fredApiKey, state);
    return { ok: true, observationCount: result.observationCount };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    state.failed = [...new Set([...state.failed, target.id])];
    state.in_progress = null;
    await persistState(supabase, state);
    return { ok: false, reason };
  }
}

async function getTableCounts(supabase: SupabaseClient): Promise<{
  seriesCount: number;
  observationCount: number;
  latestDate: string | null;
}> {
  const { count: seriesCount, error: seriesError } = await supabase
    .from("fred_series")
    .select("*", { count: "exact", head: true });

  if (seriesError) {
    throw new Error(`Failed to count fred_series: ${seriesError.message}`);
  }

  const { count: observationCount, error: obsError } = await supabase
    .from("fred_observations")
    .select("*", { count: "exact", head: true });

  if (obsError) {
    throw new Error(`Failed to count fred_observations: ${obsError.message}`);
  }

  const { data: latestRow, error: latestError } = await supabase
    .from("fred_observations")
    .select("observation_date")
    .order("observation_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to fetch latest observation date: ${latestError.message}`);
  }

  return {
    seriesCount: seriesCount ?? 0,
    observationCount: observationCount ?? 0,
    latestDate: latestRow?.observation_date ?? null,
  };
}

async function runIngestionLoop(
  supabase: SupabaseClient,
  fredApiKey: string | null,
  state: IngestionState,
  seriesIds: string[],
  permanentFailures: Map<string, string>,
): Promise<void> {
  const targetsById = new Map(FRED_TARGET_SERIES.map((target) => [target.id, target]));

  for (const seriesId of seriesIds) {
    const target = targetsById.get(seriesId);
    if (!target) continue;

    const result = await ingestSeriesSafe(supabase, target, fredApiKey, state);
    if (!result.ok) {
      permanentFailures.set(seriesId, result.reason);
    }

    await sleep(INTER_SERIES_DELAY_MS);
  }
}

export async function runFredIngestion(
  options: { force?: boolean } = {},
): Promise<FredIngestResult> {
  const status = await fetchFredStatus();
  if (!status.schemaReady) {
    throw new Error(status.schemaError ?? "FRED schema is not ready");
  }

  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured");
  }

  const fredApiKey = getFredApiKey() ?? null;
  await verifyFredSource(fredApiKey);

  const state = await loadOrInitState(supabase);
  const allIds = FRED_TARGET_SERIES.map((series) => series.id);

  if (options.force) {
    state.completed = [];
    state.failed = [];
    state.in_progress = null;
    await persistState(supabase, state);
  }

  const completedSet = new Set(state.completed);
  const pending = allIds.filter((id) => !completedSet.has(id));
  const permanentFailures = new Map<string, string>();

  await runIngestionLoop(supabase, fredApiKey, state, pending, permanentFailures);

  for (let pass = 1; pass <= MAX_RETRY_PASSES; pass += 1) {
    const retryIds = state.failed.filter((id) => allIds.includes(id));
    if (retryIds.length === 0) break;

    await sleep(RETRY_PASS_DELAY_MS);
    await runIngestionLoop(supabase, fredApiKey, state, retryIds, permanentFailures);
  }

  const counts = await getTableCounts(supabase);
  const failedSeries = [...permanentFailures.entries()].map(([seriesId, reason]) => ({
    seriesId,
    reason,
  }));

  return {
    totalSeries: allIds.length,
    ingestedSeries: state.completed.length,
    failedSeries,
    seriesCount: counts.seriesCount,
    observationCount: counts.observationCount,
    latestObservationDate: counts.latestDate,
    observationStart: FRED_OBSERVATION_START,
    source: fredApiKey ? "api" : "csv",
  };
}
