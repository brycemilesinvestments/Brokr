/**
 * FRED economic data ingestion agent.
 *
 * Usage:
 *   npx tsx scripts/ingest-fred.ts
 *   npx tsx scripts/ingest-fred.ts --resume
 */

import { loadEnvFile } from "node:process";
import { runFredIngestion } from "../src/lib/fred/ingest";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

async function main(): Promise<void> {
  const force = !process.argv.includes("--resume");
  console.log(force ? "Starting full FRED refresh..." : "Resuming pending FRED series...");

  const result = await runFredIngestion({ force });

  console.log("\nFRED INGESTION COMPLETE");
  console.log("═══════════════════════");
  console.log(`Source:                ${result.source.toUpperCase()}`);
  console.log(`Total series attempted:  ${result.totalSeries}`);
  console.log(`Successfully ingested:   ${result.ingestedSeries}`);
  console.log(`Permanently failed:      ${result.failedSeries.length}`);
  console.log(`fred_series rows:        ${result.seriesCount}`);
  console.log(`fred_observations rows:  ${result.observationCount}`);
  console.log(
    `Date range: ${result.observationStart} to ${result.latestObservationDate ?? "n/a"}`,
  );

  if (result.failedSeries.length > 0) {
    console.log("\nFailed series:");
    for (const entry of result.failedSeries) {
      console.log(`  - ${entry.seriesId}: ${entry.reason}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
