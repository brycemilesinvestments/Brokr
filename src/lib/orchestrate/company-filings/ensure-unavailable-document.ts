import type { FilingRef } from "@/lib/edgar/types";
import { filingIndexUrl, formatCik } from "@/lib/edgar";
import {
  getKnownUnavailableReason,
  unavailableDocumentPath,
} from "@/lib/orchestrate/company-filings/unavailable-filings";
import {
  getDocumentByAccession,
  upsertDocument,
  type CompanyDocumentRow,
} from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

export function documentUnavailableReason(document: CompanyDocumentRow): string | null {
  return document.unavailable_reason;
}

export function isUnavailableDocument(document: CompanyDocumentRow): boolean {
  return document.unavailable_reason != null;
}

export async function ensureUnavailableDocument(
  company: CompanyRow,
  filing: FilingRef,
  reason: string,
): Promise<CompanyDocumentRow> {
  const existing = await getDocumentByAccession(company.id, filing.accessionNumber);
  if (existing) {
    return existing;
  }

  const edgarId = formatCik(company.edgar_id);
  const document = await upsertDocument({
    companyId: company.id,
    filePath: unavailableDocumentPath(filing.accessionNumber, filing.form),
    formType: filing.form,
    accessionNumber: filing.accessionNumber,
    filingDate: filing.filingDate,
    reportDate: filing.reportDate ?? null,
    description: null,
    primaryDocument: null,
    items: filing.items ?? null,
    sizeBytes: 0,
    documentsUrl: filingIndexUrl(edgarId, filing.accessionNumber),
    unavailableReason: reason,
  });

  if (!document) {
    const raced = await getDocumentByAccession(company.id, filing.accessionNumber);
    if (raced) {
      return raced;
    }
    throw new Error(`Failed to record unavailable filing ${filing.accessionNumber}`);
  }

  return document;
}

export async function ensureKnownUnavailableDocument(
  company: CompanyRow,
  filing: FilingRef,
): Promise<CompanyDocumentRow | null> {
  const reason = getKnownUnavailableReason(filing.accessionNumber);
  if (!reason) {
    return null;
  }

  return ensureUnavailableDocument(company, filing, reason);
}
