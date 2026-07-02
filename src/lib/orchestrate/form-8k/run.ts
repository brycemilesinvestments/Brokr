import { classifyForm8k } from "@/lib/agent/form-8k";
import { formatCik, createEdgarClient, type FilingRef } from "@/lib/edgar";
import {
  fetchAndStore8k,
  filter8kFilings,
  type Stored8kDocument,
} from "@/lib/orchestrate/form-8k/fetch-and-store";
import {
  combinedDocumentText,
  ingest8kDocument,
  type Ingest8kResult,
} from "@/lib/orchestrate/form-8k/ingest-document";
import {
  getCompanyByEdgarId,
  upsertCompanyProfile,
  type CompanyRow,
} from "@/lib/supabase/companies";
import {
  getDocumentAnalysis,
  upsertDocumentAnalysis,
  type CompanyDocumentAnalysisRow,
} from "@/lib/supabase/company-documents";
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

async function ensureCompany(edgarId: string): Promise<CompanyRow> {
  const formatted = formatCik(edgarId);
  const existing = await getCompanyByEdgarId(formatted);
  if (existing) return existing;

  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const submissions = await client.getSubmissions(formatted);
  const created = await upsertCompanyProfile({
    edgarId: formatted,
    name: submissions.entityName,
  });

  if (!created) {
    throw new Error(`Unable to create company record for CIK ${formatted}`);
  }

  return created;
}

async function processFiling(
  company: CompanyRow,
  filing: FilingRef,
): Promise<Form8kSyncResult["processed"][number]> {
  const stored = await fetchAndStore8k(company, filing);
  const ingest = await ingest8kDocument({
    company,
    document: stored.document,
    form8kHtml: stored.form8kHtml,
    exhibit991Html: stored.exhibit991Html,
  });

  const documentText = combinedDocumentText(stored.form8kHtml, stored.exhibit991Html);
  const existingAnalysis = await getDocumentAnalysis(stored.document.id);
  if (existingAnalysis) {
    return {
      accessionNumber: filing.accessionNumber,
      stored,
      ingest,
      analysis: existingAnalysis,
      classification: existingAnalysis.result,
      costUsd: 0,
    };
  }

  const { classification, costUsd } = await classifyForm8k({
    accessionNumber: filing.accessionNumber,
    items: filing.items,
    formType: filing.form,
    documentText,
  });

  const analysis = await upsertDocumentAnalysis({
    documentId: stored.document.id,
    result: classification as unknown as Record<string, unknown>,
  });

  return {
    accessionNumber: filing.accessionNumber,
    stored,
    ingest,
    analysis,
    classification: classification as unknown as Record<string, unknown>,
    costUsd,
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
