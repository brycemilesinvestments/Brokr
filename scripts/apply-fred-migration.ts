/**
 * Apply the FRED tables migration directly to Postgres.
 *
 * Used when `supabase db push` is unavailable (no Supabase access token). Requires
 * a direct database connection via DATABASE_URL or SUPABASE_DB_PASSWORD.
 *
 * Usage:
 *   npx tsx scripts/apply-fred-migration.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

const MIGRATION_FILE = resolve(
  process.cwd(),
  "supabase/migrations/20260702140000_create_fred_tables.sql",
);

function getEnv(name: string, aliases: string[] = []): string | undefined {
  if (process.env[name]) return process.env[name];
  for (const alias of aliases) {
    if (process.env[alias]) return process.env[alias];
  }
  return undefined;
}

/** Build a pooler connection string from project URL + database password. */
export function resolveDatabaseUrl(): string | null {
  const direct = getEnv("DATABASE_URL", ["SUPABASE_DB_URL", "POSTGRES_URL"]);
  if (direct) return direct;

  const password = getEnv("SUPABASE_DB_PASSWORD", ["POSTGRES_PASSWORD", "DB_PASSWORD"]);
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL", ["SUPABASE_URL"]);
  if (!password || !supabaseUrl) return null;

  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const poolerHost = getEnv("SUPABASE_POOLER_HOST") ?? `aws-1-us-west-2.pooler.supabase.com`;
  const encodedPassword = encodeURIComponent(password);

  return `postgresql://postgres.${ref}:${encodedPassword}@${poolerHost}:6543/postgres`;
}

export function hasDatabaseCredentials(): boolean {
  return resolveDatabaseUrl() !== null;
}

export async function applyFredMigration(): Promise<void> {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Database credentials missing. Set DATABASE_URL or SUPABASE_DB_PASSWORD (with NEXT_PUBLIC_SUPABASE_URL).",
    );
  }

  const sql = readFileSync(MIGRATION_FILE, "utf8");
  const { Client } = await import("pg");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  console.log("Applying FRED migration...\n");
  await applyFredMigration();
  console.log("Migration applied successfully.");
  console.log(`  Source: ${MIGRATION_FILE}`);
}

const invokedDirectly = process.argv[1]?.includes("apply-fred-migration");
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
