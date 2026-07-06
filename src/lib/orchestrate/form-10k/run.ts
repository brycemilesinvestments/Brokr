import { createEdgarClient, type FilingRef } from "@/lib/edgar";
import { analyzeStored10k } from "@/lib/orchestrate/company-filings/analyze-10k";
import { ensureCompany } from "@/lib/orchestrate/company-filings/ensure-company";
import { loadStored10kHtml } from "@/lib/orchestrate/company-filings/load-stored-document";
import { storeCompanyFiling } from "@/lib/orchestrate/company-filings/store-filing";
import { filter10kFilings, type Stored10kDocument } from "@/lib/orchestrate/form-10k/fetch-and-store";
import type { Ingest10kSectionsResult } from "@/lib/orchestrate/form-10k/ingest-sections";
import type { CompanyDocumentAnalysisRow } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";
import { createAdminClient } from "@/lib/supabase/admin";

export type Form10kSyncResult = {
  company: CompanyRow;
  processed: Array<{
    accessionNumber: string;
    stored: Stored10kDocument;
    ingest: Ingest10kSectionsResult;
    analysis: CompanyDocumentAnalysisRow | null;
    result: Record<string, unknown>;
    costUsd: number;
  }>;
  errors: Array<{ accessionNumber: string; message: string }>;
};

async function processFiling(
  company: CompanyRow,
  filing: FilingRef,
): Promise<Form10kSyncResult["processed"][number]> {
  const { document, skipped } = await storeCompanyFiling(company, filing);
  const html = await loadStored10kHtml(document);
  const stored: Stored10kDocument = { document, html, skipped };
  const analyzed = await analyzeStored10k(company, document, filing);

  return {
    accessionNumber: filing.accessionNumber,
    stored,
    ingest: analyzed.ingest,
    analysis: analyzed.analysis,
    result: analyzed.result,
    costUsd: analyzed.costUsd,
  };
}

export async function runForm10kSync(
  edgarIdInput: string,
  options: { accessionNumber?: string } = {},
): Promise<Form10kSyncResult> {
  const company = await ensureCompany(edgarIdInput);
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await client.getSubmissions(company.edgar_id);

  let filings = filter10kFilings(submissions.filings);
  if (options.accessionNumber) {
    filings = filings.filter((filing) => filing.accessionNumber === options.accessionNumber);
  }

  const processed: Form10kSyncResult["processed"] = [];
  const errors: Form10kSyncResult["errors"] = [];

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
