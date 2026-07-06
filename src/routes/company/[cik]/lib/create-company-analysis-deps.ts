import { createAiClient } from "@/lib/ai";
import { createEdgarClient } from "@/lib/edgar";
import { buildFilingDateLookup, toEventStudyTransactions } from "@/lib/insider";
import type { AnalyzeCompanyDeps } from "@/lib/orchestrate/analyze-company";
import { parseMasterConfigFromEnv } from "@/lib/orchestrate/types";
import { createMarketClient } from "@/lib/market";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStoredInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-stored-insider-transactions";
import { fetchInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-insider-transactions";

async function loadEventStudyTransactions(cik: string) {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });

  const [stored, scraped, submissions] = await Promise.all([
    fetchStoredInsiderTransactions(cik).catch(() => null),
    fetchInsiderTransactions(cik).catch(() => null),
    edgar.getSubmissions(cik).catch(() => null),
  ]);

  const page =
    stored && stored.transactions.length > 0
      ? stored
      : scraped;

  if (!page) return [];

  const filingDateByAccession = buildFilingDateLookup(submissions?.filings ?? []);
  return toEventStudyTransactions(page.transactions, filingDateByAccession);
}

export function createCompanyAnalysisDeps(): AnalyzeCompanyDeps {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });

  let ai;
  try {
    ai = createAiClient();
  } catch {
    ai = undefined;
  }

  return {
    edgar,
    market: createMarketClient(),
    ai,
    config: parseMasterConfigFromEnv(),
    fetchInsiderTransactions: loadEventStudyTransactions,
  };
}
