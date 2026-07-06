import type { FilingRef } from "@/lib/edgar/types";
import { fetchAndStore8k } from "@/lib/orchestrate/form-8k/fetch-and-store";
import { fetchAndStore10k } from "@/lib/orchestrate/form-10k/fetch-and-store";
import { ensureKnownUnavailableDocument } from "@/lib/orchestrate/company-filings/ensure-unavailable-document";
import { runInflightStore } from "@/lib/orchestrate/company-filings/inflight-store";
import {
  type PipelineRunOptions,
  throwIfAborted,
} from "@/lib/orchestrate/client-abort";
import type { CompanyDocumentRow } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

export type StoreFilingResult = {
  document: CompanyDocumentRow;
  skipped: boolean;
};

export function isStorableFormType(formType: string): boolean {
  return /^8-K/i.test(formType) || /^10-K/i.test(formType);
}

async function storeCompanyFilingInner(
  company: CompanyRow,
  filing: FilingRef,
  options: PipelineRunOptions,
): Promise<StoreFilingResult> {
  throwIfAborted(options.signal);

  const unavailable = await ensureKnownUnavailableDocument(company, filing);
  if (unavailable) {
    return { document: unavailable, skipped: true };
  }

  if (/^8-K/i.test(filing.form)) {
    const stored = await fetchAndStore8k(company, filing);
    throwIfAborted(options.signal);
    return { document: stored.document, skipped: stored.skipped };
  }

  if (/^10-K/i.test(filing.form)) {
    const stored = await fetchAndStore10k(company, filing);
    throwIfAborted(options.signal);
    return { document: stored.document, skipped: stored.skipped };
  }

  throw new Error(`Unsupported form type for storage: ${filing.form}`);
}

export async function storeCompanyFiling(
  company: CompanyRow,
  filing: FilingRef,
  options: PipelineRunOptions = {},
): Promise<StoreFilingResult> {
  return runInflightStore(`${company.id}:${filing.accessionNumber}`, () =>
    storeCompanyFilingInner(company, filing, options),
  );
}
