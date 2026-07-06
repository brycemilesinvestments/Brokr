import { classifyForm8k } from "@/lib/agent/form-8k";
import type { FilingRef } from "@/lib/edgar/types";
import {
  combinedDocumentText,
  ingest8kDocument,
  type Ingest8kResult,
} from "@/lib/orchestrate/form-8k/ingest-document";
import { isUnavailableDocument } from "@/lib/orchestrate/company-filings/ensure-unavailable-document";
import { loadStored8kContent } from "@/lib/orchestrate/company-filings/load-stored-document";
import {
  type PipelineRunOptions,
  throwIfAborted,
} from "@/lib/orchestrate/client-abort";
import {
  getDocumentAnalysis,
  upsertDocumentAnalysis,
  type CompanyDocumentAnalysisRow,
  type CompanyDocumentRow,
} from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

export type Analyze8kResult = {
  accessionNumber: string;
  ingest: Ingest8kResult;
  analysis: CompanyDocumentAnalysisRow | null;
  classification: Record<string, unknown>;
  costUsd: number;
  skippedAnalysis: boolean;
};

export async function analyzeStored8k(
  company: CompanyRow,
  document: CompanyDocumentRow,
  filing: FilingRef,
  options: PipelineRunOptions = {},
): Promise<Analyze8kResult> {
  throwIfAborted(options.signal);

  if (isUnavailableDocument(document)) {
    return {
      accessionNumber: filing.accessionNumber,
      ingest: { chunksStored: 0, embedCalls: 0, skippedDuplicate: true },
      analysis: null,
      classification: { unavailable: true, reason: document.unavailable_reason },
      costUsd: 0,
      skippedAnalysis: true,
    };
  }

  const [{ form8kHtml, exhibit991Html }, existingAnalysis] = await Promise.all([
    loadStored8kContent(document),
    getDocumentAnalysis(document.id),
  ]);
  throwIfAborted(options.signal);

  const ingest = await ingest8kDocument({
    company,
    document,
    form8kHtml,
    exhibit991Html,
  });
  throwIfAborted(options.signal);

  if (existingAnalysis) {
    return {
      accessionNumber: filing.accessionNumber,
      ingest,
      analysis: existingAnalysis,
      classification: existingAnalysis.result,
      costUsd: 0,
      skippedAnalysis: true,
    };
  }

  const documentText = combinedDocumentText(form8kHtml, exhibit991Html);
  throwIfAborted(options.signal);

  const { classification, costUsd } = await classifyForm8k({
    accessionNumber: filing.accessionNumber,
    items: filing.items,
    formType: filing.form,
    documentText,
  });

  const analysis = await upsertDocumentAnalysis({
    documentId: document.id,
    result: classification as unknown as Record<string, unknown>,
  });

  return {
    accessionNumber: filing.accessionNumber,
    ingest,
    analysis,
    classification: classification as unknown as Record<string, unknown>,
    costUsd,
    skippedAnalysis: false,
  };
}
