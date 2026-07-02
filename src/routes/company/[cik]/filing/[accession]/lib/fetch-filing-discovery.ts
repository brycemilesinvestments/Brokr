import { createAiClient } from "@/lib/ai";
import { createEdgarClient } from "@/lib/edgar";
import {
  analyzeFilingDiscovery,
  createSignalCache,
} from "@/lib/orchestrate/filing-discovery";
import type { FilingDiscoveryOutput } from "@/lib/orchestrate/filing-discovery";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FilingDetailPage } from "@/routes/company/[cik]/filing/[accession]/types";

export async function fetchFilingDiscovery(
  filing: FilingDetailPage,
): Promise<FilingDiscoveryOutput> {
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const [companyFacts, xbrl] = await Promise.all([
    edgar.getCompanyFacts(filing.cik),
    edgar.fetchFilingXbrl(
      filing.cik,
      filing.accessionNumber,
      filing.documents,
    ),
  ]);

  const ixbrlFacts = xbrl.documents.flatMap((doc) => doc.facts);
  const cache = createSignalCache({ supabaseClient: createAdminClient() ?? undefined });

  let ai;
  try {
    ai = createAiClient();
  } catch {
    ai = undefined;
  }

  return analyzeFilingDiscovery({
    cik: filing.cik,
    accessionNumber: filing.accessionNumber,
    companyFacts,
    ixbrlFacts,
    cache,
    ai,
  });
}
