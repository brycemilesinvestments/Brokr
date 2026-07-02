import {
  createEdgarClient,
  filingDocumentUrl,
  filingIndexUrl,
  formatCik,
  type FilingRef,
} from "@/lib/edgar";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDocumentByAccession,
  upsertDocument,
  type CompanyDocumentRow,
} from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";
import { pick8kDocumentsFromItems, parseFilingIndexHtml } from "@/lib/orchestrate/form-8k/parse-filing-index";
import { form8kEventDate, form8kStoragePath, EDGAR_BUCKET } from "@/lib/orchestrate/form-8k/paths";

export type Stored8kDocument = {
  document: CompanyDocumentRow;
  form8kHtml: string;
  exhibit991Html: string | null;
  skipped: boolean;
};

async function uploadToBucket(path: string, content: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is required to store 8-K documents");
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

/**
 * Fetch an 8-K filing from SEC, store HTML in Supabase Storage, and upsert company_documents.
 */
export async function fetchAndStore8k(
  company: CompanyRow,
  filing: FilingRef,
): Promise<Stored8kDocument> {
  const existing = await getDocumentByAccession(company.id, filing.accessionNumber);
  if (existing) {
    const supabase = createAdminClient();
    let form8kHtml = "";
    if (supabase) {
      const { data } = await supabase.storage.from(EDGAR_BUCKET).download(existing.file_path);
      if (data) {
        form8kHtml = await data.text();
      }
    }

    const ex99Path = existing.file_path.replace(/\.htm$/, "-ex99.htm");
    let exhibit991Html: string | null = null;
    if (supabase) {
      const { data } = await supabase.storage.from(EDGAR_BUCKET).download(ex99Path);
      if (data) {
        exhibit991Html = await data.text();
      }
    }

    return {
      document: existing,
      form8kHtml,
      exhibit991Html,
      skipped: true,
    };
  }

  const edgarId = formatCik(company.edgar_id);
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const indexHtml = await client.fetchText(filingIndexUrl(edgarId, filing.accessionNumber), {
    useCache: false,
    cik: edgarId,
    accession: filing.accessionNumber,
    filename: `${filing.accessionNumber}-index.htm`,
  });
  const { form8k, exhibit991 } = pick8kDocumentsFromItems(parseFilingIndexHtml(indexHtml));

  const primaryFilename = form8k?.name ?? filing.primaryDocument;
  if (!primaryFilename) {
    throw new Error(`No 8-K document found in filing index for ${filing.accessionNumber}`);
  }

  const eventDate = form8kEventDate(filing);
  const primaryPath = form8kStoragePath(company.id, eventDate);
  const form8kHtml = await downloadFilingHtml(edgarId, filing.accessionNumber, primaryFilename);
  await uploadToBucket(primaryPath, form8kHtml);

  let exhibit991Html: string | null = null;
  if (exhibit991?.name) {
    const ex99Path = form8kStoragePath(company.id, eventDate, "ex99");
    exhibit991Html = await downloadFilingHtml(edgarId, filing.accessionNumber, exhibit991.name);
    await uploadToBucket(ex99Path, exhibit991Html);
  }

  const document = await upsertDocument({
    companyId: company.id,
    filePath: primaryPath,
    formType: filing.form,
    accessionNumber: filing.accessionNumber,
    filingDate: filing.filingDate,
    reportDate: filing.reportDate ?? null,
    description: form8k?.description ?? null,
    primaryDocument: primaryFilename,
    items: filing.items ?? null,
    sizeBytes: Buffer.byteLength(form8kHtml, "utf8"),
    documentsUrl: filingIndexUrl(edgarId, filing.accessionNumber),
  });

  if (!document) {
    throw new Error(`Failed to upsert company_documents for ${filing.accessionNumber}`);
  }

  return {
    document,
    form8kHtml,
    exhibit991Html,
    skipped: false,
  };
}

export function filter8kFilings(filings: FilingRef[]): FilingRef[] {
  return filings.filter((filing) => /^8-K/i.test(filing.form));
}
