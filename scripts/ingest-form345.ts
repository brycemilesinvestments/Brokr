/**
 * Form 3/4/5 insider ownership ingestion agent.
 *
 * Usage:
 *   npx tsx scripts/ingest-form345.ts --cik 320193 --limit 10
 *   npx tsx scripts/ingest-form345.ts --accession 0001140361-26-025622 --cik 320193 --filed 2026-06-17
 */

import { loadEnvFile } from "node:process";
import {
  ingestForm345Filing,
  runForm345IngestionForCik,
} from "../src/lib/orchestrate/form-345";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const cik = readArg("--cik");
  const accession = readArg("--accession");
  const filed = readArg("--filed");
  const limit = Number(readArg("--limit") ?? "20");

  if (accession && cik && filed) {
    const result = await ingestForm345Filing({
      cik,
      accessionNumber: accession,
      filedDate: filed,
    });

    console.log("\nFORM 3/4/5 INGESTION COMPLETE");
    console.log("══════════════════════════════");
    console.log(`Accession:        ${result.accessionNumber}`);
    console.log(`Skipped:          ${result.skipped}`);
    console.log(`Form type:        ${result.formType}`);
    console.log(`Rows inserted:    ${result.rowsInserted}`);
    console.log(`Tier 3 calls:     ${result.tier3Calls}`);
    console.log(`Cache hits:       ${result.cacheHits}`);
    console.log(`Cache misses:     ${result.cacheMisses}`);
    console.log(`Parse warnings:   ${result.parseWarnings}`);
    return;
  }

  if (!cik) {
    console.error("Provide --cik <cik> or --accession + --cik + --filed");
    process.exit(1);
  }

  const batch = await runForm345IngestionForCik(cik, { limit });

  console.log("\nFORM 3/4/5 BATCH INGESTION COMPLETE");
  console.log("═══════════════════════════════════");
  console.log(`CIK:              ${cik}`);
  console.log(`Processed:        ${batch.filingsProcessed}`);
  console.log(`Skipped:          ${batch.filingsSkipped}`);
  console.log(`Tier 3 calls:     ${batch.tier3Calls}`);
  console.log(`Cache hits:       ${batch.cacheHits}`);
  console.log(`Cache misses:     ${batch.cacheMisses}`);
  console.log(`Failures:         ${batch.failures.length}`);

  for (const failure of batch.failures) {
    console.log(`  - ${failure.accessionNumber}: ${failure.error}`);
  }

  const totalFootnoteLookups = batch.cacheHits + batch.cacheMisses;
  if (totalFootnoteLookups > 0) {
    const hitRate = ((batch.cacheHits / totalFootnoteLookups) * 100).toFixed(1);
    console.log(`Cache hit rate:   ${hitRate}%`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
