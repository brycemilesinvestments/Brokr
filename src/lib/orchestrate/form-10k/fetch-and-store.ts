import {
  createEdgarClient,
  filingDocumentUrl,
  filingIndexUrl,
  formatCik,
  type FilingRef,
} from "@/lib/edgar";
import { parseFilingIndexHtml } from "@/lib/orchestrate/form-8k/parse-filing-index";
import { pick10kPrimaryDocument } from "@/lib/orchestrate/form-10k/parse-filing-index";
import {
  EDGAR_BUCKET,
  form10kReportDate,
  form10kStoragePath,
} from "@/lib/orchestrate/form-10k/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDocumentByAccession,
  upsertDocument,
  type CompanyDocumentRow,
} from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

export type Stored10kDocument = {
  document: CompanyDocumentRow;
  html: string;
  skipped: boolean;
};

async function uploadToBucket(path: string, content: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to store 10-K documents");
  }

  const { error } = await supabase.storage.from(EDGAR_BUCKET).upload(path, content, {
    contentType: "text/html",
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed for ${path}: ${error.message}`);
  }
}

async function downloadFilingHtml(
  edgarId: string,
  accessionNumber: string,
  filename: string,
): Promise<string> {
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const url = filingDocumentUrl(edgarId, accessionNumber, filename);
  return client.fetchText(url, {
    useCache: false,
    cik: edgarId,
    accession: accessionNumber,
    filename,
  });
}

export async function fetchAndStore10k(
  company: CompanyRow,
  filing: FilingRef,
): Promise<Stored10kDocument> {
  const existing = await getDocumentByAccession(company.id, filing.accessionNumber);
  if (existing) {
    const supabase = createAdminClient();
    let html = "";
    if (supabase) {
      const { data } = await supabase.storage.from(EDGAR_BUCKET).download(existing.file_path);
      if (data) html = await data.text();
    }
    return { document: existing, html, skipped: true };
  }

  const edgarId = formatCik(company.edgar_id);
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const indexHtml = await client.fetchText(filingIndexUrl(edgarId, filing.accessionNumber), {
    useCache: false,
    cik: edgarId,
    accession: filing.accessionNumber,
    filename: `${filing.accessionNumber}-index.htm`,
  });

  const primary = pick10kPrimaryDocument(parseFilingIndexHtml(indexHtml));
  const primaryFilename = primary?.name ?? filing.primaryDocument;
  if (!primaryFilename) {
    throw new Error(`No 10-K document found in filing index for ${filing.accessionNumber}`);
  }

  const reportDate = form10kReportDate(filing);
  const storagePath = form10kStoragePath(company.id, reportDate);
  const html = await downloadFilingHtml(edgarId, filing.accessionNumber, primaryFilename);
  await uploadToBucket(storagePath, html);

  const document = await upsertDocument({
    companyId: company.id,
    filePath: storagePath,
    formType: filing.form,
    accessionNumber: filing.accessionNumber,
    filingDate: filing.filingDate,
    reportDate: filing.reportDate ?? null,
    description: primary?.description ?? null,
    primaryDocument: primaryFilename,
    sizeBytes: Buffer.byteLength(html, "utf8"),
    documentsUrl: filingIndexUrl(edgarId, filing.accessionNumber),
  });

  if (!document) {
    throw new Error(`Failed to upsert company_documents for ${filing.accessionNumber}`);
  }

  return { document, html, skipped: false };
}

export function filter10kFilings(filings: FilingRef[]): FilingRef[] {
  return filings.filter((filing) => /^10-K/i.test(filing.form));
}

function filterPeriodicFilings(filings: FilingRef[]): FilingRef[] {
  return filings.filter((filing) => /^10-K/i.test(filing.form) || /^10-Q/i.test(filing.form));
}
