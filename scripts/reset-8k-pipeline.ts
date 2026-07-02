/**
 * Reset 8-K pipeline artifacts so sync can re-embed and re-classify.
 *
 * Keeps company_documents rows and Supabase Storage HTML — no SEC re-fetch needed.
 *
 * Usage:
 *   npx tsx scripts/reset-8k-pipeline.ts
 *   npx tsx scripts/reset-8k-pipeline.ts --cik 0001234567
 *   npx tsx scripts/reset-8k-pipeline.ts --dry-run
 *
 * Loads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.
 */

import { loadEnvFile } from "node:process";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

try {
  loadEnvFile(".env.local");
} catch {
  // Vars may already be set in the environment.
}

type Options = {
  cik: string | null;
  dryRun: boolean;
  skipAnalyses: boolean;
  skipEmbeddings: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    cik: null,
    dryRun: false,
    skipAnalyses: false,
    skipEmbeddings: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--skip-analyses") options.skipAnalyses = true;
    else if (arg === "--skip-embeddings") options.skipEmbeddings = true;
    else if (arg === "--cik") {
      options.cik = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Reset 8-K embeddings and classifications for a fresh pipeline run.

Options:
  --cik <cik>         Limit to one company (CIK or ticker, e.g. 0002023554 or SNDK)
  --dry-run           Print what would be deleted without writing
  --skip-analyses     Keep company_document_analyses (skip re-classification)
  --skip-embeddings   Keep filing_chunks (skip re-embedding only)
  --help              Show this message
`);
}

function requireAdminClient(): SupabaseClient {
  const client = createAdminClient();
  if (!client) {
    throw new Error(
      "Supabase admin client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local",
    );
  }
  return client;
}

async function list8kDocumentIds(
  supabase: SupabaseClient,
  companyDbId: number | null,
): Promise<number[]> {
  let query = supabase
    .from("company_documents")
    .select("id")
    .ilike("form_type", "8-K%");

  if (companyDbId != null) {
    query = query.eq("company_id", companyDbId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`company_documents query failed: ${error.message}`);
  return (data ?? []).map((row) => Number(row.id));
}

async function listAccessions(
  supabase: SupabaseClient,
  companyDbId: number | null,
): Promise<string[]> {
  let query = supabase
    .from("company_documents")
    .select("accession_number")
    .ilike("form_type", "8-K%");

  if (companyDbId != null) {
    query = query.eq("company_id", companyDbId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`company_documents query failed: ${error.message}`);
  return (data ?? []).map((row) => String(row.accession_number));
}

async function resolveCompanyDbId(supabase: SupabaseClient, cikOrTicker: string): Promise<number> {
  const digits = cikOrTicker.replace(/\D/g, "");
  if (digits.length >= 4) {
    const edgarId = digits.padStart(10, "0");
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("edgar_id", edgarId)
      .maybeSingle();

    if (error) throw new Error(`companies query failed: ${error.message}`);
    if (data) return Number(data.id);
  }

  const ticker = cikOrTicker.trim().toUpperCase();
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .ilike("ticker", ticker)
    .maybeSingle();

  if (error) throw new Error(`companies query failed: ${error.message}`);
  if (!data) throw new Error(`No company found for CIK or ticker "${cikOrTicker}"`);
  return Number(data.id);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = requireAdminClient();

  const companyDbId = options.cik ? await resolveCompanyDbId(supabase, options.cik) : null;
  const documentIds = await list8kDocumentIds(supabase, companyDbId);
  const accessions = await listAccessions(supabase, companyDbId);

  console.log(
    options.cik
      ? `8-K documents for ${options.cik}: ${documentIds.length}`
      : `8-K documents (all companies): ${documentIds.length}`,
  );

  if (documentIds.length === 0) {
    console.log("Nothing to reset.");
    return;
  }

  if (options.dryRun) {
    console.log("Dry run — would reset:");
    if (!options.skipEmbeddings) {
      console.log(`  - filing_chunks for ${documentIds.length} document(s)`);
      console.log(`  - filing_ingest_status for ${accessions.length} accession(s)`);
    }
    if (!options.skipAnalyses) {
      console.log(`  - company_document_analyses for ${documentIds.length} document(s)`);
    }
    console.log("  - company_documents and storage HTML would be kept");
    return;
  }

  if (!options.skipEmbeddings) {
    const { error: chunkError, count: chunkCount } = await supabase
      .from("filing_chunks")
      .delete({ count: "exact" })
      .in("document_id", documentIds);

    if (chunkError) {
      throw new Error(`filing_chunks delete failed: ${chunkError.message}`);
    }
    console.log(`Deleted ${chunkCount ?? 0} filing_chunks row(s).`);

    if (accessions.length > 0) {
      const { error: statusError, count: statusCount } = await supabase
        .from("filing_ingest_status")
        .delete({ count: "exact" })
        .in("accession", accessions);

      if (statusError) {
        throw new Error(`filing_ingest_status delete failed: ${statusError.message}`);
      }
      console.log(`Deleted ${statusCount ?? 0} ingest status row(s).`);
    }
  }

  if (!options.skipAnalyses) {
    const { error: analysisError, count: analysisCount } = await supabase
      .from("company_document_analyses")
      .delete({ count: "exact" })
      .in("document_id", documentIds);

    if (analysisError) {
      throw new Error(`company_document_analyses delete failed: ${analysisError.message}`);
    }
    console.log(`Deleted ${analysisCount ?? 0} analysis row(s).`);
  }

  console.log("Done. Re-run 8-K sync to re-embed and re-classify.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
