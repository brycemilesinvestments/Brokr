import { createEdgarClient, type FilingRef } from "@/lib/edgar";
import { analyzeStored8k } from "@/lib/orchestrate/company-filings/analyze-8k";
import { ensureCompany } from "@/lib/orchestrate/company-filings/ensure-company";
import { loadStored8kContent } from "@/lib/orchestrate/company-filings/load-stored-document";
import { storeCompanyFiling } from "@/lib/orchestrate/company-filings/store-filing";
import { type Ingest8kResult } from "@/lib/orchestrate/form-8k/ingest-document";
import { filter8kFilings, type Stored8kDocument } from "@/lib/orchestrate/form-8k/fetch-and-store";
import type { CompanyDocumentAnalysisRow } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";
import { createAdminClient } from "@/lib/supabase/admin";

export type Form8kSyncResult = {
  company: CompanyRow;
  processed: Array<{
    accessionNumber: string;
    stored: Stored8kDocument;
    ingest: Ingest8kResult;
    analysis: CompanyDocumentAnalysisRow | null;
    classification: Record<string, unknown>;
    costUsd: number;
  }>;
  errors: Array<{ accessionNumber: string; message: string }>;
};

async function processFiling(
  company: CompanyRow,
  filing: FilingRef,
): Promise<Form8kSyncResult["processed"][number]> {
  const { document, skipped } = await storeCompanyFiling(company, filing);
  const content = await loadStored8kContent(document);
  const stored: Stored8kDocument = {
    document,
    form8kHtml: content.form8kHtml,
    exhibit991Html: content.exhibit991Html,
    skipped,
  };
  const analyzed = await analyzeStored8k(company, document, filing);

  return {
    accessionNumber: filing.accessionNumber,
    stored,
    ingest: analyzed.ingest,
    analysis: analyzed.analysis,
    classification: analyzed.classification,
    costUsd: analyzed.costUsd,
  };
}

export async function runForm8kSync(
  edgarIdInput: string,
  options: { accessionNumber?: string } = {},
): Promise<Form8kSyncResult> {
  const company = await ensureCompany(edgarIdInput);
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await client.getSubmissions(company.edgar_id);

  let filings = filter8kFilings(submissions.filings);
  if (options.accessionNumber) {
    filings = filings.filter((filing) => filing.accessionNumber === options.accessionNumber);
  }

  const processed: Form8kSyncResult["processed"] = [];
  const errors: Form8kSyncResult["errors"] = [];

  const results = await Promise.allSettled(
    filings.map((filing) => processFiling(company, filing)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      processed.push(result.value);
      continue;
    }
    errors.push({
      accessionNumber: filings[i].accessionNumber,
      message: result.reason instanceof Error ? result.reason.message : "Unknown error",
    });
  }

  return { company, processed, errors };
}
