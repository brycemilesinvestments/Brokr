/**
 * Apply FRED schema migration to Supabase Postgres.
 *
 * Usage:
 *   npx tsx scripts/setup-fred-schema.ts
 *
 * Connection (first match wins):
 *   DATABASE_URL
 *   SUPABASE_DB_URL
 *   SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL (builds pooler URL)
 */

import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { applyFredMigration } from "./apply-fred-migration";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

function getEnv(...names: string[]): string | undefined {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

async function verifyTables(): Promise<void> {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const key = getEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY");
  if (!url || !key) {
    throw new Error("Supabase URL and secret key are required for verification");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key } },
  });

  for (const table of ["fred_series", "fred_observations", "fred_ingestion_state"]) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      throw new Error(`${table} is not accessible: ${error.message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("Applying FRED schema migration...");
  await applyFredMigration();

  console.log("Verifying fred_* tables via Supabase REST API...");
  await verifyTables();
  console.log("FRED schema is ready.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
