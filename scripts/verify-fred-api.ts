/**
 * Verify FRED API access for all target economic series (no Supabase writes).
 *
 * Usage:
 *   npx tsx scripts/verify-fred-api.ts
 *
 * Environment:
 *   FRED_API_KEY — required
 */

import { execFile } from "node:child_process";
import { loadEnvFile } from "node:process";
import { promisify } from "node:util";
import { TARGET_SERIES } from "./fred-target-series";

const execFileAsync = promisify(execFile);

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

const FRED_BASE = "https://api.stlouisfed.org/fred";
const OBSERVATION_START = "1984-01-01";
const INTER_REQUEST_DELAY_MS = 400;

type FredSeriesResponse = {
  seriess?: Array<{ title?: string }>;
};

type FredObservationsResponse = {
  observations?: Array<{ date: string; value: string }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFred<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<T> {
  const url = new URL(`${FRED_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");

  const { stdout } = await execFileAsync(
    "curl",
    ["-fsSL", "--max-time", "120", url.toString()],
    { maxBuffer: 32 * 1024 * 1024 },
  );

  return JSON.parse(stdout) as T;
}

async function verifySeries(
  seriesId: string,
  apiKey: string,
): Promise<{ observationCount: number; title: string }> {
  const seriesData = await fetchFred<FredSeriesResponse>("/series", { series_id: seriesId }, apiKey);
  const title = seriesData.seriess?.[0]?.title;
  if (!title) {
    throw new Error("series metadata missing title");
  }

  const obsData = await fetchFred<FredObservationsResponse>(
    "/series/observations",
    {
      series_id: seriesId,
      observation_start: OBSERVATION_START,
      sort_order: "asc",
    },
    apiKey,
  );

  const observationCount = (obsData.observations ?? []).filter((row) => row.value !== ".").length;
  if (observationCount === 0) {
    throw new Error(`no observations since ${OBSERVATION_START}`);
  }

  return { observationCount, title };
}

async function main(): Promise<void> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error("FRED_API_KEY is required");
    process.exit(1);
  }

  console.log(`Verifying ${TARGET_SERIES.length} FRED series...\n`);

  const failures: Array<{ id: string; reason: string }> = [];
  let totalObservations = 0;

  for (const target of TARGET_SERIES) {
    try {
      const result = await verifySeries(target.id, apiKey);
      totalObservations += result.observationCount;
      console.log(
        `  OK  ${target.id.padEnd(16)} ${String(result.observationCount).padStart(5)} obs  ${result.title}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ id: target.id, reason });
      console.log(`  FAIL ${target.id.padEnd(15)} ${reason}`);
    }

    await sleep(INTER_REQUEST_DELAY_MS);
  }

  console.log("\nFRED API VERIFICATION");
  console.log("═════════════════════");
  console.log(`Series checked:     ${TARGET_SERIES.length}`);
  console.log(`Successful:         ${TARGET_SERIES.length - failures.length}`);
  console.log(`Failed:             ${failures.length}`);
  console.log(`Total observations: ${totalObservations}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(`  - ${failure.id}: ${failure.reason}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
