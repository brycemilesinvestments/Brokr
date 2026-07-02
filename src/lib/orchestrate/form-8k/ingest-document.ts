import type { ProseSection, ProseSections } from "@/lib/edgar/discovery";
import { emptyProseSections } from "@/lib/edgar/discovery";
import { createEmbeddingClient } from "@/lib/rag/embed/client";
import { chunkSections } from "@/lib/rag/ingest/chunk-sections";
import {
  createSupabaseChunkStore,
  embedAndStore,
  type ChunkStore,
} from "@/lib/rag/store/chunk-store";
import { htmlToPlainText } from "@/lib/orchestrate/form-8k/html-to-text";
import { EDGAR_BUCKET } from "@/lib/orchestrate/form-8k/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyDocumentRow } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";

function buildProseSections(form8kText: string, exhibit991Text: string | null): ProseSections {
  const sections: Partial<ProseSections> = {};

  if (form8kText.length > 0) {
    const section: ProseSection = {
      key: "form_8k_body",
      concept: "form_8k_body",
      taxonomy: "8-K",
      text: form8kText,
      charCount: form8kText.length,
    };
    sections.form_8k_body = section;
  } else {
    sections.form_8k_body = null;
  }

  if (exhibit991Text && exhibit991Text.length > 0) {
    sections.exhibit_99_1 = {
      key: "exhibit_99_1",
      concept: "exhibit_99_1",
      taxonomy: "EX-99.1",
      text: exhibit991Text,
      charCount: exhibit991Text.length,
    };
  } else {
    sections.exhibit_99_1 = null;
  }

  return {
    ...emptyProseSections(),
    form_8k_body: sections.form_8k_body ?? null,
    exhibit_99_1: sections.exhibit_99_1 ?? null,
  };
}

export type Ingest8kResult = {
  chunksStored: number;
  embedCalls: number;
  skippedDuplicate: boolean;
};

export async function ingest8kDocument(input: {
  company: CompanyRow;
  document: CompanyDocumentRow;
  form8kHtml: string;
  exhibit991Html: string | null;
  store?: ChunkStore;
}): Promise<Ingest8kResult> {
  const supabase = createAdminClient();
  const store =
    input.store ??
    (supabase ? createSupabaseChunkStore(supabase) : null);

  if (!store) {
    return { chunksStored: 0, embedCalls: 0, skippedDuplicate: false };
  }

  const form8kText = htmlToPlainText(input.form8kHtml);
  const exhibit991Text = input.exhibit991Html ? htmlToPlainText(input.exhibit991Html) : null;
  const proseSections = buildProseSections(form8kText, exhibit991Text);
  const periodEnd = input.document.report_date ?? input.document.filing_date;

  const chunks = chunkSections({
    companyId: input.company.edgar_id,
    accession: input.document.accession_number,
    periodEnd,
    proseSections,
  }).map((chunk) => ({
    ...chunk,
    documentId: input.document.id,
  }));

  await store.upsertIngestStatus({
    companyId: input.company.edgar_id,
    accession: input.document.accession_number,
    chunksDone: true,
  });

  const embedder = createEmbeddingClient();
  const result = await embedAndStore(store, {
    companyId: input.company.edgar_id,
    accession: input.document.accession_number,
    chunks,
    embedder,
  });

  return {
    chunksStored: result.stored,
    embedCalls: result.embedCalls,
    skippedDuplicate: result.skippedDuplicate,
  };
}

async function loadStored8kHtml(
  filePath: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(EDGAR_BUCKET).download(filePath);
  if (error || !data) return null;
  return data.text();
}

export function combinedDocumentText(form8kHtml: string, exhibit991Html: string | null): string {
  const parts = [htmlToPlainText(form8kHtml)];
  if (exhibit991Html) {
    parts.push(htmlToPlainText(exhibit991Html));
  }
  return parts.join("\n\n");
}
