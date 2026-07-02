/**
 * FRED economic data ingestion agent.
 *
 * Pulls major economic time series from the St. Louis Fed FRED API and stores
 * them in Supabase. Resumes from fred_ingestion_state on interruption.
 *
 * Usage:
 *   npx tsx scripts/ingest-fred.ts
 *
 * Environment:
 *   FRED_API_KEY              — required; free key from https://fred.stlouisfed.org/docs/api/api_key.html
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL (or SUPABASE_URL)
 *   SUPABASE_SECRET_KEY       — service role key (or SUPABASE_SERVICE_KEY)
 */

import { loadEnvFile } from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

const FRED_BASE = "https://api.stlouisfed.org/fred";
const OBSERVATION_START = "1984-01-01";
const BATCH_SIZE = 500;
const INTER_SERIES_DELAY_MS = 600;
const RETRY_PASS_DELAY_MS = 10_000;
const MAX_RETRY_PASSES = 2;

type SeriesTarget = {
  id: string;
  category: string;
  description: string;
};

const TARGET_SERIES: SeriesTarget[] = [
  // Employment
  { id: "UNRATE", category: "Employment", description: "Unemployment rate" },
  { id: "PAYEMS", category: "Employment", description: "Nonfarm payrolls" },
  { id: "ICSA", category: "Employment", description: "Initial jobless claims (weekly)" },
  { id: "JTSJOL", category: "Employment", description: "Job openings" },
  {
    id: "LNS12300060",
    category: "Employment",
    description: "Prime age employment rate (25-54)",
  },
  // Inflation
  { id: "CPIAUCSL", category: "Inflation", description: "CPI all items" },
  { id: "CPILFESL", category: "Inflation", description: "Core CPI (less food and energy)" },
  { id: "PCEPI", category: "Inflation", description: "PCE price index (Fed's preferred measure)" },
  { id: "PCEPILFE", category: "Inflation", description: "Core PCE" },
  { id: "T10YIE", category: "Inflation", description: "10-year breakeven inflation expectations" },
  { id: "PPIFIS", category: "Inflation", description: "Producer Price Index final demand" },
  // Interest Rates
  { id: "FEDFUNDS", category: "Interest Rates", description: "Federal funds rate" },
  { id: "DGS10", category: "Interest Rates", description: "10-year treasury yield" },
  { id: "DGS2", category: "Interest Rates", description: "2-year treasury yield" },
  {
    id: "T10Y2Y",
    category: "Interest Rates",
    description: "Yield curve spread (10Y minus 2Y, recession signal)",
  },
  { id: "BAMLH0A0HYM2", category: "Interest Rates", description: "High yield credit spread" },
  { id: "MORTGAGE30US", category: "Interest Rates", description: "30-year mortgage rate" },
  // GDP & Growth
  { id: "GDP", category: "GDP & Growth", description: "Nominal GDP" },
  {
    id: "A191RL1Q225SBEA",
    category: "GDP & Growth",
    description: "Real GDP growth rate (quarter over quarter)",
  },
  { id: "GDPC1", category: "GDP & Growth", description: "Real GDP chained dollars" },
  { id: "GFDEGDQ188S", category: "GDP & Growth", description: "Federal debt as percent of GDP" },
  // Consumer
  {
    id: "RSXFS",
    category: "Consumer",
    description: "Retail sales excluding food services",
  },
  { id: "PCE", category: "Consumer", description: "Personal consumption expenditures" },
  { id: "PSAVERT", category: "Consumer", description: "Personal savings rate" },
  { id: "UMCSENT", category: "Consumer", description: "University of Michigan consumer sentiment" },
  { id: "DSPIC96", category: "Consumer", description: "Real disposable personal income" },
  // Business & Capex
  {
    id: "PNFI",
    category: "Business & Capex",
    description: "Private nonresidential fixed investment (economy-wide capex)",
  },
  { id: "INDPRO", category: "Business & Capex", description: "Industrial production index" },
  { id: "CAPUTLB00004SQ", category: "Business & Capex", description: "Capacity utilization" },
  { id: "ISRATIO", category: "Business & Capex", description: "Business inventory to sales ratio" },
  { id: "MNFCTRIRSA", category: "Business & Capex", description: "Manufacturing inventories" },
  // Housing
  { id: "HOUST", category: "Housing", description: "Housing starts" },
  { id: "PERMIT", category: "Housing", description: "Building permits" },
  { id: "EXHOSLUSM495S", category: "Housing", description: "Existing home sales" },
  { id: "CSUSHPINSA", category: "Housing", description: "Case-Shiller national home price index" },
  // Credit & Financial Conditions
  {
    id: "DRCCLACBS",
    category: "Credit & Financial Conditions",
    description: "Credit card delinquency rate",
  },
  {
    id: "DRSFRMACBS",
    category: "Credit & Financial Conditions",
    description: "Mortgage delinquency rate",
  },
  {
    id: "TOTCI",
    category: "Credit & Financial Conditions",
    description: "Total consumer credit outstanding",
  },
  {
    id: "NFCI",
    category: "Credit & Financial Conditions",
    description: "Chicago Fed National Financial Conditions Index",
  },
  // Trade & Dollar
  { id: "BOPGSTB", category: "Trade & Dollar", description: "Trade balance goods and services" },
  { id: "DTWEXBGS", category: "Trade & Dollar", description: "Nominal broad US dollar index" },
  // Leading Indicators
  {
    id: "USSLIND",
    category: "Leading Indicators",
    description: "Conference Board Leading Economic Index",
  },
  { id: "USREC", category: "Leading Indicators", description: "NBER recession indicator (1 = recession)" },
  { id: "VIXCLS", category: "Leading Indicators", description: "VIX volatility index" },
  { id: "M2SL", category: "Leading Indicators", description: "M2 money supply" },
];

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

type SeriesFailure = {
  seriesId: string;
  reason: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnv(name: string, aliases: string[] = []): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const alias of aliases) {
    if (process.env[alias]) return process.env[alias];
  }
  return undefined;
}

function verifyEnvironment(): {
  fredApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
} {
  const fredApiKey = getEnv("FRED_API_KEY");
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL", ["SUPABASE_URL"]);
  const supabaseKey = getEnv("SUPABASE_SECRET_KEY", ["SUPABASE_SERVICE_KEY"]);

  const missing: string[] = [];
  if (!fredApiKey) missing.push("FRED_API_KEY");
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!supabaseKey) missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_KEY)");

  if (missing.length > 0) {
    console.error("ENVIRONMENT CHECK FAILED — missing required variables:");
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }

  return {
    fredApiKey: fredApiKey!,
    supabaseUrl: supabaseUrl!,
    supabaseKey: supabaseKey!,
  };
}

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyFredApi(fredApiKey: string): Promise<void> {
  const url = new URL(`${FRED_BASE}/series`);
  url.searchParams.set("series_id", "UNRATE");
  url.searchParams.set("api_key", fredApiKey);
  url.searchParams.set("file_type", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API check failed: HTTP ${response.status} ${response.statusText}`);
  }
}

async function verifySupabaseTables(supabase: SupabaseClient): Promise<void> {
  const tables = ["fred_series", "fred_observations", "fred_ingestion_state"] as const;
  const missing: string[] = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      missing.push(`${table}: ${error.message}`);
    }
  }

  if (missing.length > 0) {
    console.error("SUPABASE SCHEMA CHECK FAILED — required tables are missing or inaccessible:");
    for (const detail of missing) {
      console.error(`  - ${detail}`);
    }
    console.error(
      "\nApply the migration at supabase/migrations/20260702140000_create_fred_tables.sql",
    );
    process.exit(1);
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
        console.warn("FRED rate limit (429) — waiting 30s before retry");
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
  seriesId: string,
  fredApiKey: string,
): Promise<{
  title: string;
  frequency: string | null;
  units: string | null;
  seasonal_adjustment: string | null;
  last_updated: string | null;
}> {
  const data = await fetchFredJson<FredSeriesResponse>(
    "/series",
    { series_id: seriesId },
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

async function fetchObservations(
  seriesId: string,
  fredApiKey: string,
): Promise<Array<{ observation_date: string; value: number }>> {
  const data = await fetchFredJson<FredObservationsResponse>(
    "/series/observations",
    {
      series_id: seriesId,
      observation_start: OBSERVATION_START,
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
    if (!Number.isFinite(parsed)) {
      console.warn(`  Skipping unparseable value for ${seriesId} on ${obs.date}: ${obs.value}`);
      continue;
    }

    rows.push({ observation_date: obs.date, value: parsed });
  }

  return rows;
}

async function upsertSeries(
  supabase: SupabaseClient,
  target: SeriesTarget,
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
  target: SeriesTarget,
  fredApiKey: string,
  state: IngestionState,
): Promise<{ observationCount: number }> {
  state.in_progress = target.id;
  await persistState(supabase, state);

  const metadata = await fetchSeriesMetadata(target.id, fredApiKey);
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
  target: SeriesTarget,
  fredApiKey: string,
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

function printProgress(
  seriesId: string,
  observationCount: number,
  completedCount: number,
  total: number,
): void {
  const remaining = total - completedCount;
  console.log(
    `${seriesId}: stored ${observationCount} observations | completed ${completedCount}/${total} | remaining ${remaining}`,
  );
}

async function runIngestionLoop(
  supabase: SupabaseClient,
  fredApiKey: string,
  state: IngestionState,
  seriesIds: string[],
  permanentFailures: Map<string, string>,
): Promise<void> {
  const total = TARGET_SERIES.length;
  const targetsById = new Map(TARGET_SERIES.map((t) => [t.id, t]));

  for (const seriesId of seriesIds) {
    const target = targetsById.get(seriesId);
    if (!target) continue;

    const result = await ingestSeriesSafe(supabase, target, fredApiKey, state);

    if (result.ok) {
      printProgress(seriesId, result.observationCount, state.completed.length, total);
    } else {
      permanentFailures.set(seriesId, result.reason);
      console.error(`${seriesId}: FAILED — ${result.reason}`);
      printProgress(seriesId, 0, state.completed.length, total);
    }

    await sleep(INTER_SERIES_DELAY_MS);
  }
}

async function main(): Promise<void> {
  console.log("Step 1 — Verifying environment...\n");
  const { fredApiKey, supabaseUrl, supabaseKey } = verifyEnvironment();
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  await verifyFredApi(fredApiKey);
  console.log("  FRED API: OK");

  await verifySupabaseTables(supabase);
  console.log("  Supabase fred_* tables: OK\n");

  console.log("Step 3 — Loading ingestion state...\n");
  const state = await loadOrInitState(supabase);

  const allIds = TARGET_SERIES.map((s) => s.id);
  const completedSet = new Set(state.completed);
  const pending = allIds.filter((id) => !completedSet.has(id));

  console.log(`  Already completed: ${state.completed.length}`);
  console.log(`  Previously failed:  ${state.failed.length}`);
  console.log(`  Remaining:          ${pending.length}`);
  if (state.in_progress) {
    console.log(`  Resuming in-progress: ${state.in_progress}`);
  }
  console.log();

  const permanentFailures = new Map<string, string>();

  console.log("Step 5 — Main ingestion loop...\n");
  await runIngestionLoop(supabase, fredApiKey, state, pending, permanentFailures);

  for (let pass = 1; pass <= MAX_RETRY_PASSES; pass += 1) {
    const retryIds = state.failed.filter((id) => allIds.includes(id));
    if (retryIds.length === 0) break;

    console.log(`\nStep 6 — Retry pass ${pass}/${MAX_RETRY_PASSES} (${retryIds.length} series)...\n`);
    await sleep(RETRY_PASS_DELAY_MS);

    for (const seriesId of [...retryIds]) {
      const target = TARGET_SERIES.find((s) => s.id === seriesId);
      if (!target) continue;

      const result = await ingestSeriesSafe(supabase, target, fredApiKey, state);
      if (result.ok) {
        permanentFailures.delete(seriesId);
        printProgress(seriesId, result.observationCount, state.completed.length, allIds.length);
      } else {
        permanentFailures.set(seriesId, result.reason);
        console.error(`${seriesId}: retry FAILED — ${result.reason}`);
      }

      await sleep(INTER_SERIES_DELAY_MS);
    }
  }

  const counts = await getTableCounts(supabase);
  const finalFailed = [...permanentFailures.entries()];

  console.log("\nFRED INGESTION COMPLETE");
  console.log("═══════════════════════");
  console.log(`Total series attempted:  ${allIds.length}`);
  console.log(`Successfully ingested:   ${state.completed.length}`);
  console.log(`Permanently failed:      ${finalFailed.length}`);

  if (finalFailed.length > 0) {
    console.log("\nFailed series:");
    for (const [seriesId, reason] of finalFailed) {
      console.log(`  - ${seriesId}: ${reason}`);
    }
    console.log(
      "\nRemediation: verify the series ID exists on FRED, confirm API key quota, and re-run `npm run ingest-fred`.",
    );
  }

  console.log("\nSupabase tables populated:");
  console.log(`  • fred_series        — ${counts.seriesCount} rows`);
  console.log(`  • fred_observations  — ${counts.observationCount} rows`);
  console.log(`\nDate range: ${OBSERVATION_START} to ${counts.latestDate ?? "n/a"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
