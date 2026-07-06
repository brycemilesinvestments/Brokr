import { type Form10kOutput } from "@/lib/agent/form-10k";
import { createAiClient } from "@/lib/ai";
import { createEdgarClient, extractIxbrl, type FilingRef } from "@/lib/edgar";
import { buildSectionCoverage, emptyProseSections, locateForm10kSections } from "@/lib/edgar/discovery";
import type { NumericMetricMap, ProseDiffModel } from "@/lib/filing-diff/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import { isUnavailableDocument } from "@/lib/orchestrate/company-filings/ensure-unavailable-document";
import { loadStored10kHtml } from "@/lib/orchestrate/company-filings/load-stored-document";
import { documentToFilingRef } from "@/lib/orchestrate/company-filings/to-filing-ref";
import { runForm10kAgent } from "@/lib/orchestrate/form-10k/analyze-filing";
import type { Known8kEvent } from "@/lib/orchestrate/form-10k/cross-ref-8k-events";
import { ingest10kSections, type Ingest10kSectionsResult } from "@/lib/orchestrate/form-10k/ingest-sections";
import { FORM10K_ANALYSIS_TYPE } from "@/lib/orchestrate/form-10k/paths";
import {
  type PipelineRunOptions,
  throwIfAborted,
} from "@/lib/orchestrate/client-abort";
import {
  getDocumentAnalysis,
  getDocumentByAccession,
  listDocumentsByCompany,
  upsertDocumentAnalysis,
  type CompanyDocumentAnalysisRow,
  type CompanyDocumentRow,
} from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFilingDiffCache } from "@/routes/lib/runtime-caches";

export type Analyze10kResult = {
  accessionNumber: string;
  ingest: Ingest10kSectionsResult;
  analysis: CompanyDocumentAnalysisRow | null;
  result: Record<string, unknown>;
  costUsd: number;
  skippedAnalysis: boolean;
};

function metricsFromFacts(facts: XbrlFact[]): NumericMetricMap {
  const map: NumericMetricMap = {};
  for (const fact of facts) {
    if (fact.numericValue == null) continue;
    map[`${fact.taxonomy}:${fact.concept}`] = fact.numericValue;
  }
  return map;
}

function createProseDiffModel(): ProseDiffModel | undefined {
  try {
    const ai = createAiClient();
    return async ({ sections }) => {
      const response = await ai.complete({
        max_tokens: 1024,
        system:
          "You compare SEC filing prose year-over-year. Return JSON: { changed: boolean, sections: [{ key, changed, summary? }], refusal: false }",
        messages: [{ role: "user", content: JSON.stringify(sections) }],
      });
      const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { changed: false, sections: [], refusal: true, costUsd: 0 };
      }
      return {
        changed: parsed.changed === true,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        refusal: false,
        costUsd: ai.estimateCostUsd(inputTokens, outputTokens),
        model: ai.getModel(),
      };
    };
  } catch {
    return undefined;
  }
}

function shouldReuseCachedAnalysis(
  existing: CompanyDocumentAnalysisRow,
  ingest: Ingest10kSectionsResult,
): boolean {
  const stored = existing.result as { sectionCoverage?: { sectionsPresent?: string[] } };
  const storedCount = stored.sectionCoverage?.sectionsPresent?.length ?? 0;
  const ingestCount = ingest.sectionCoverage.sectionsPresent.length;
  return storedCount > 0 && ingestCount <= storedCount;
}

async function loadKnown8kEvents(companyId: number): Promise<Known8kEvent[]> {
  const documents = await listDocumentsByCompany(companyId);
  const eightKDocs = documents.filter((doc) => /^8-K/i.test(doc.form_type));
  const analyses = await Promise.all(eightKDocs.map((doc) => getDocumentAnalysis(doc.id)));

  const events: Known8kEvent[] = [];
  for (let i = 0; i < eightKDocs.length; i++) {
    const doc = eightKDocs[i];
    const analysis = analyses[i];
    if (!analysis) continue;
    const result = analysis.result;
    const eventType =
      typeof result.primaryEventType === "string" ? result.primaryEventType : "unknown";
    events.push({
      accessionNumber: doc.accession_number,
      eventType,
      eventDate: doc.report_date ?? doc.filing_date,
      searchTerms: [
        eventType,
        ...(typeof result.itemLabels === "object"
          ? Object.values(result.itemLabels as Record<string, string>)
          : []),
      ],
    });
  }

  return events;
}

async function loadStoredHtmlByAccession(
  companyId: number,
  accessionNumber: string,
): Promise<string | null> {
  const doc = await getDocumentByAccession(companyId, accessionNumber);
  if (!doc) return null;
  try {
    return await loadStored10kHtml(doc);
  } catch {
    return null;
  }
}

function storedFilingsAsRefs(company: CompanyRow, documents: CompanyDocumentRow[]): FilingRef[] {
  return documents.map((document) => documentToFilingRef(company.edgar_id, document));
}

export async function analyzeStored10k(
  company: CompanyRow,
  document: CompanyDocumentRow,
  filing: FilingRef,
  options: PipelineRunOptions = {},
): Promise<Analyze10kResult> {
  throwIfAborted(options.signal);

  if (isUnavailableDocument(document)) {
    const emptySections = emptyProseSections();
    return {
      accessionNumber: filing.accessionNumber,
      ingest: {
        sections: emptySections,
        sectionCoverage: buildSectionCoverage(emptySections),
        chunks: [],
        chunksStored: 0,
        embedCalls: 0,
        pgvectorReady: false,
      },
      analysis: null,
      result: { unavailable: true, reason: document.unavailable_reason },
      costUsd: 0,
      skippedAnalysis: true,
    };
  }

  const html = await loadStored10kHtml(document);
  throwIfAborted(options.signal);

  const ixbrlFacts = extractIxbrl(html).facts;

  const [ingest, existingAnalysis] = await Promise.all([
    ingest10kSections({
      company,
      document,
      ixbrlFacts,
      html,
      form: filing.form,
    }),
    getDocumentAnalysis(document.id, FORM10K_ANALYSIS_TYPE),
  ]);
  throwIfAborted(options.signal);

  if (existingAnalysis && shouldReuseCachedAnalysis(existingAnalysis, ingest)) {
    return {
      accessionNumber: filing.accessionNumber,
      ingest,
      analysis: existingAnalysis,
      result: existingAnalysis.result,
      costUsd: 0,
      skippedAnalysis: true,
    };
  }

  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const companyFacts = await client.getCompanyFacts(company.edgar_id);
  const periodEnd = document.report_date ?? document.filing_date;
  const storedDocuments = await listDocumentsByCompany(company.id);
  const allFilings = storedFilingsAsRefs(company, storedDocuments);
  const known8kEvents = await loadKnown8kEvents(company.id);

  const pair = (
    await import("@/lib/orchestrate/form-10k/pair-annual-filings")
  ).pairAnnualFilings(company.edgar_id, allFilings, filing.accessionNumber);

  let previousSections;
  let previousFacts: XbrlFact[] | undefined;
  let previousMetrics: NumericMetricMap | undefined;

  if (pair?.previous) {
    const prevHtml = await loadStoredHtmlByAccession(company.id, pair.previous.accessionNumber);
    throwIfAborted(options.signal);
    if (prevHtml) {
      previousFacts = extractIxbrl(prevHtml).facts;
      previousSections = locateForm10kSections(previousFacts, prevHtml);
      previousMetrics = metricsFromFacts(previousFacts);
    }
  }

  throwIfAborted(options.signal);

  const output: Form10kOutput = await runForm10kAgent({
    cik: company.edgar_id,
    accessionNumber: filing.accessionNumber,
    form: filing.form,
    periodEnd,
    filings: allFilings,
    ixbrlFacts,
    companyFacts,
    sections: ingest.sections,
    chunks: ingest.chunks,
    metrics: metricsFromFacts(ixbrlFacts),
    previousMetrics,
    previousSections,
    previousFacts,
    known8kEvents,
    diffCache: getFilingDiffCache(),
    aiDiff: createProseDiffModel(),
  });

  const result = {
    ...(output as unknown as Record<string, unknown>),
    sectionCoverage: ingest.sectionCoverage,
  };
  const analysis = await upsertDocumentAnalysis({
    documentId: document.id,
    analysisType: FORM10K_ANALYSIS_TYPE,
    result,
  });

  return {
    accessionNumber: filing.accessionNumber,
    ingest,
    analysis,
    result,
    costUsd: output.costUsd,
    skippedAnalysis: false,
  };
}
