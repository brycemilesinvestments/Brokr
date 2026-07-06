import { analyzeStored8k } from "@/lib/orchestrate/company-filings/analyze-8k";
import { analyzeStored10k } from "@/lib/orchestrate/company-filings/analyze-10k";
import { storeCompanyFiling } from "@/lib/orchestrate/company-filings/store-filing";
import { documentToFilingRef } from "@/lib/orchestrate/company-filings/to-filing-ref";
import { type PipelineRunOptions, throwIfAborted } from "@/lib/orchestrate/client-abort";
import type { FilingRef } from "@/lib/edgar/types";
import type { CompanyRow } from "@/lib/supabase/companies";

export type ProcessFilingResult = {
  accessionNumber: string;
  formType: string;
  skippedStore: boolean;
  skippedAnalysis: boolean;
  costUsd: number;
};

export async function processCompanyFiling(
  company: CompanyRow,
  filing: FilingRef,
  options: PipelineRunOptions = {},
): Promise<ProcessFilingResult> {
  const { document, skipped: skippedStore } = await storeCompanyFiling(company, filing, options);
  throwIfAborted(options.signal);
  const filingRef = documentToFilingRef(company.edgar_id, document);

  if (/^8-K/i.test(document.form_type)) {
    const result = await analyzeStored8k(company, document, filingRef, options);
    return {
      accessionNumber: result.accessionNumber,
      formType: document.form_type,
      skippedStore,
      skippedAnalysis: result.skippedAnalysis,
      costUsd: result.costUsd,
    };
  }

  if (/^10-K/i.test(document.form_type)) {
    const result = await analyzeStored10k(company, document, filingRef, options);
    return {
      accessionNumber: result.accessionNumber,
      formType: document.form_type,
      skippedStore,
      skippedAnalysis: result.skippedAnalysis,
      costUsd: result.costUsd,
    };
  }

  throw new Error(`Unsupported form type: ${document.form_type}`);
}
