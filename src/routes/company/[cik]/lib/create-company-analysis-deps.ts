import { createAiClient } from "@/lib/ai";
import { createEdgarClient } from "@/lib/edgar";
import { buildFilingDateLookup, toEventStudyTransactions } from "@/lib/insider";
import type { AnalyzeCompanyDeps } from "@/lib/orchestrate/analyze-company";
import { parseMasterConfigFromEnv } from "@/lib/orchestrate/types";
import { createMarketClient } from "@/lib/market";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStoredInsiderTransactions } from "@/routes/company/[cik]/features/insider-transactions/lib/fetch-stored-insider-transactions";

async function loadEventStudyTransactions(cik: string) {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });

  const [stored, submissions] = await Promise.all([
    fetchStoredInsiderTransactions(cik).catch(() => null),
    edgar.getSubmissions(cik).catch(() => null),
  ]);

  if (!stored || stored.transactions.length === 0) return [];

  const filingDateByAccession = buildFilingDateLookup(submissions?.filings ?? []);
  return toEventStudyTransactions(stored.transactions, filingDateByAccession);
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
