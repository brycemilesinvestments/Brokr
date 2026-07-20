/**
 * Earnings call transcript scrape agent.
 *
 *   npx tsx scripts/ingest-earnings-calls.ts --cik 320193 --limit 5
 */
import { createEdgarClient } from "../src/lib/edgar";
import { runEarningsCallScrape } from "../src/lib/earnings-calls";
import { ensureCompany } from "../src/lib/orchestrate/company-filings/ensure-company";
import { createSupabaseEarningsCallStore } from "../src/lib/supabase/earnings-calls";
import { createAdminClient } from "../src/lib/supabase/admin";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const cik = readArg("--cik");
  if (!cik) {
    console.error("Usage: npx tsx scripts/ingest-earnings-calls.ts --cik <cik> [--limit 10] [--force]");
    process.exit(1);
  }

  const limit = Number.parseInt(readArg("--limit") ?? "10", 10);
  const force = process.argv.includes("--force");
  const company = await ensureCompany(cik);
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await edgar.getSubmissions(cik);
  const store = createSupabaseEarningsCallStore();

  const result = await runEarningsCallScrape(company, {
    filings: submissions.filings,
    limit: Number.isFinite(limit) ? limit : 10,
    force,
    store: store ?? undefined,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
