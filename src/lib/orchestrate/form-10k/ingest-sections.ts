import { buildSectionCoverage, locateForm10kSections } from "@/lib/edgar/discovery";
import type { SectionCoverage } from "@/lib/edgar/discovery";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import { createEmbeddingClient } from "@/lib/rag/embed/client";
import { chunkSections } from "@/lib/rag/ingest/chunk-sections";
import {
  createSupabaseChunkStore,
  embedAndStore,
  type ChunkStore,
} from "@/lib/rag/store/chunk-store";
import { tagFilingAuditStatus } from "@/lib/orchestrate/form-10k/tag-audit-status";
import { confirmPgvectorSchema } from "@/lib/orchestrate/form-10k/confirm-pgvector-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyDocumentRow } from "@/lib/supabase/company-documents";
import type { CompanyRow } from "@/lib/supabase/companies";
import type { FilingChunk } from "@/lib/rag/types";
import type { ProseSections } from "@/lib/edgar/discovery";

export type Ingest10kSectionsResult = {
  sections: ProseSections;
  sectionCoverage: SectionCoverage;
  chunks: FilingChunk[];
  chunksStored: number;
  embedCalls: number;
  pgvectorReady: boolean;
};

/** K1 — Section-aware chunking with audited metadata. */
export async function ingest10kSections(input: {
  company: CompanyRow;
  document: CompanyDocumentRow;
  ixbrlFacts: XbrlFact[];
  html?: string | null;
  form: string;
  store?: ChunkStore;
}): Promise<Ingest10kSectionsResult> {
  const sections = locateForm10kSections(input.ixbrlFacts, input.html);
  const sectionCoverage = buildSectionCoverage(sections);
  const audited = tagFilingAuditStatus(input.form);
  const periodEnd = input.document.report_date ?? input.document.filing_date;

  const chunks = chunkSections({
    companyId: input.company.edgar_id,
    accession: input.document.accession_number,
    periodEnd,
    proseSections: sections,
    audited,
  }).map((chunk) => ({
    ...chunk,
    documentId: input.document.id,
  }));

  const supabase = createAdminClient();
  const store =
    input.store ??
    (supabase ? createSupabaseChunkStore(supabase) : null);

  let chunksStored = 0;
  let embedCalls = 0;

  if (store) {
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
    chunksStored = result.stored;
    embedCalls = result.embedCalls;
  }

  return {
    sections,
    sectionCoverage,
    chunks,
    chunksStored,
    embedCalls,
    pgvectorReady: confirmPgvectorSchema(chunks),
  };
}
