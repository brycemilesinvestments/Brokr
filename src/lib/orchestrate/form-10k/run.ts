import {
  type Form10kOutput,
} from "@/lib/agent/form-10k";
import { createAiClient } from "@/lib/ai";
import {
  createEdgarClient,
  extractIxbrl,
  formatCik,
  type FilingRef,
} from "@/lib/edgar";
import { locateForm10kSections } from "@/lib/edgar/discovery";
import type { NumericMetricMap, ProseDiffModel } from "@/lib/filing-diff/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import {
  fetchAndStore10k,
  filter10kFilings,
  type Stored10kDocument,
} from "@/lib/orchestrate/form-10k/fetch-and-store";
import { ingest10kSections, type Ingest10kSectionsResult } from "@/lib/orchestrate/form-10k/ingest-sections";
import { FORM10K_ANALYSIS_TYPE } from "@/lib/orchestrate/form-10k/paths";
import { runForm10kAgent } from "@/lib/orchestrate/form-10k/analyze-filing";
import type { Known8kEvent } from "@/lib/orchestrate/form-10k/cross-ref-8k-events";
import {
  getCompanyByEdgarId,
  upsertCompanyProfile,
  type CompanyRow,
} from "@/lib/supabase/companies";
import {
  getDocumentAnalysis,
  listDocumentsByCompany,
  upsertDocumentAnalysis,
  type CompanyDocumentAnalysisRow,
} from "@/lib/supabase/company-documents";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFilingDiffCache } from "@/routes/lib/runtime-caches";

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
        messages: [
          {
            role: "user",
            content: JSON.stringify(sections),
          },
        ],
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
      searchTerms: [eventType, ...(typeof result.itemLabels === "object" ? Object.values(result.itemLabels as Record<string, string>) : [])],
    });
  }

  return events;
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

async function processFiling(
  company: CompanyRow,
  filing: FilingRef,
  allFilings: FilingRef[],
  known8kEvents: Known8kEvent[],
): Promise<Form10kSyncResult["processed"][number]> {
  const stored = await fetchAndStore10k(company, filing);
  const ixbrlFacts = extractIxbrl(stored.html).facts;

  const [ingest, existingAnalysis] = await Promise.all([
    ingest10kSections({
      company,
      document: stored.document,
      ixbrlFacts,
      html: stored.html,
      form: filing.form,
    }),
    getDocumentAnalysis(stored.document.id, FORM10K_ANALYSIS_TYPE),
  ]);
  if (existingAnalysis && shouldReuseCachedAnalysis(existingAnalysis, ingest)) {
    return {
      accessionNumber: filing.accessionNumber,
      stored,
      ingest,
      analysis: existingAnalysis,
      result: existingAnalysis.result,
      costUsd: 0,
    };
  }

  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const companyFacts = await client.getCompanyFacts(company.edgar_id);
  const periodEnd = stored.document.report_date ?? stored.document.filing_date;

  const pair = (
    await import("@/lib/orchestrate/form-10k/pair-annual-filings")
  ).pairAnnualFilings(company.edgar_id, allFilings, filing.accessionNumber);

  let previousSections;
  let previousFacts: XbrlFact[] | undefined;
  let previousMetrics: NumericMetricMap | undefined;

  if (pair?.previous) {
    const prevStored = await getDocumentByAccessionSafe(company.id, pair.previous.accessionNumber);
    if (prevStored?.html) {
      previousFacts = extractIxbrl(prevStored.html).facts;
      previousSections = locateForm10kSections(previousFacts, prevStored.html);
      previousMetrics = metricsFromFacts(previousFacts);
    } else {
      const prevHtml = await fetchFilingHtml(company.edgar_id, pair.previous);
      if (prevHtml) {
        previousFacts = extractIxbrl(prevHtml).facts;
        previousSections = locateForm10kSections(previousFacts, prevHtml);
        previousMetrics = metricsFromFacts(previousFacts);
      }
    }
  }

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
    documentId: stored.document.id,
    analysisType: FORM10K_ANALYSIS_TYPE,
    result,
  });

  return {
    accessionNumber: filing.accessionNumber,
    stored,
    ingest,
    analysis,
    result,
    costUsd: output.costUsd,
  };
}

async function getDocumentByAccessionSafe(
  companyId: number,
  accessionNumber: string,
): Promise<{ html: string } | null> {
  const { getDocumentByAccession } = await import("@/lib/supabase/company-documents");
  const doc = await getDocumentByAccession(companyId, accessionNumber);
  if (!doc) return null;

  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data } = await supabase.storage.from("edgar").download(doc.file_path);
  if (!data) return null;
  return { html: await data.text() };
}

async function fetchFilingHtml(edgarId: string, filing: FilingRef): Promise<string | null> {
  if (!filing.primaryDocument) return null;
  const client = createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const { filingDocumentUrl } = await import("@/lib/edgar/constants");
  const url = filingDocumentUrl(edgarId, filing.accessionNumber, filing.primaryDocument);
  try {
    return await client.fetchText(url, {
      useCache: true,
      cik: edgarId,
      accession: filing.accessionNumber,
      filename: filing.primaryDocument,
    });
  } catch {
    return null;
  }
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

  const known8kEvents = await loadKnown8kEvents(company.id);
  const processed: Form10kSyncResult["processed"] = [];
  const errors: Form10kSyncResult["errors"] = [];

  const results = await Promise.allSettled(
    filings.map((filing) =>
      processFiling(company, filing, submissions.filings, known8kEvents),
    ),
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
