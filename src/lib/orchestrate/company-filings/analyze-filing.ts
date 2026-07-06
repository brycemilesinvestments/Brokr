import { analyzeStored8k } from "@/lib/orchestrate/company-filings/analyze-8k";
import { analyzeStored10k } from "@/lib/orchestrate/company-filings/analyze-10k";
import { runInflightAnalyze } from "@/lib/orchestrate/company-filings/inflight-analyze";
import { documentToFilingRef } from "@/lib/orchestrate/company-filings/to-filing-ref";
import {
  type PipelineRunOptions,
  throwIfAborted,
} from "@/lib/orchestrate/client-abort";
import { getDocumentByAccession } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

export type AnalyzeFilingResult = {
  accessionNumber: string;
  formType: string;
  skippedAnalysis: boolean;
  costUsd: number;
};

async function analyzeCompanyFilingInner(
  company: CompanyRow,
  accessionNumber: string,
  options: PipelineRunOptions,
): Promise<AnalyzeFilingResult> {
  throwIfAborted(options.signal);

  const document = await getDocumentByAccession(company.id, accessionNumber);
  if (!document) {
    throw new Error(`Document must be stored before analysis: ${accessionNumber}`);
  }

  const filing = documentToFilingRef(company.edgar_id, document);

  if (/^8-K/i.test(document.form_type)) {
    const result = await analyzeStored8k(company, document, filing, options);
    return {
      accessionNumber: result.accessionNumber,
      formType: document.form_type,
      skippedAnalysis: result.skippedAnalysis,
      costUsd: result.costUsd,
    };
  }

  if (/^10-K/i.test(document.form_type)) {
    const result = await analyzeStored10k(company, document, filing, options);
    return {
      accessionNumber: result.accessionNumber,
      formType: document.form_type,
      skippedAnalysis: result.skippedAnalysis,
      costUsd: result.costUsd,
    };
  }

  throw new Error(`Unsupported form type for analysis: ${document.form_type}`);
}

export async function analyzeCompanyFiling(
  company: CompanyRow,
  accessionNumber: string,
  options: PipelineRunOptions = {},
): Promise<AnalyzeFilingResult> {
  return runInflightAnalyze(`${company.id}:${accessionNumber}`, () =>
    analyzeCompanyFilingInner(company, accessionNumber, options),
  );
}
