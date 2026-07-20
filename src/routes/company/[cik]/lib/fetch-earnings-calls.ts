import { formatCik } from "@/lib/edgar/constants";
import { createEdgarClient } from "@/lib/edgar";
import { runEarningsCallScrape } from "@/lib/earnings-calls";
import { ensureCompany } from "@/lib/orchestrate/company-filings/ensure-company";
import {
  createSupabaseEarningsCallStore,
  type EarningsCallTranscriptRow,
} from "@/lib/supabase/earnings-calls";
import { createAdminClient } from "@/lib/supabase/admin";

export type EarningsCallsPage = {
  cik: string;
  transcripts: Array<{
    id: number;
    sourceUrl: string;
    sourceType: EarningsCallTranscriptRow["source_type"];
    eventDate: string | null;
    title: string | null;
    charCount: number;
    syntheticAccession: string;
    embedded: boolean;
    linked8kAccession: string | null;
    scrapeError: string | null;
  }>;
};

function mapRow(row: EarningsCallTranscriptRow): EarningsCallsPage["transcripts"][number] {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    eventDate: row.event_date,
    title: row.title,
    charCount: row.char_count,
    syntheticAccession: row.synthetic_accession,
    embedded: Boolean(row.embedded_at),
    linked8kAccession: row.linked_8k_accession,
    scrapeError: row.scrape_error,
  };
}

export async function fetchStoredEarningsCalls(cik: string): Promise<EarningsCallsPage> {
  const edgarId = formatCik(cik);
  const store = createSupabaseEarningsCallStore();
  if (!store) {
    return { cik: edgarId, transcripts: [] };
  }

  const rows = await store.listByIssuerCik(edgarId);
  return {
    cik: edgarId,
    transcripts: rows.map(mapRow),
  };
}

export async function syncEarningsCalls(
  cik: string,
  options: { limit?: number; force?: boolean } = {},
) {
  const edgarId = formatCik(cik);
  const company = await ensureCompany(edgarId);
  const edgar = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await edgar.getSubmissions(edgarId);

  const scrape = await runEarningsCallScrape(company, {
    filings: submissions.filings,
    limit: options.limit,
    force: options.force,
  });

  const page = await fetchStoredEarningsCalls(edgarId);
  return { ...page, scrape };
}
