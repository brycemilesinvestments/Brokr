import { EARNINGS_CALL_SECTION_KEY } from "@/lib/earnings-calls/constants";
import type { IngestTranscriptResult } from "@/lib/earnings-calls/types";
import type { ProseSection, ProseSections } from "@/lib/edgar/discovery";
import { emptyProseSections } from "@/lib/edgar/discovery";
import { createEmbeddingClient } from "@/lib/rag/embed/client";
import { chunkSections } from "@/lib/rag/ingest/chunk-sections";
import {
  createSupabaseChunkStore,
  embedAndStore,
  type ChunkStore,
} from "@/lib/rag/store/chunk-store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyRow } from "@/lib/supabase/companies";

function buildTranscriptSections(plainText: string): ProseSections {
  const section: ProseSection = {
    key: EARNINGS_CALL_SECTION_KEY,
    concept: EARNINGS_CALL_SECTION_KEY,
    taxonomy: "earnings_call",
    text: plainText,
    charCount: plainText.length,
    source: "html_heading_fallback",
  };

  return {
    ...emptyProseSections(),
    earnings_call_transcript: section,
  };
}

export async function ingestTranscript(input: {
  company: CompanyRow;
  syntheticAccession: string;
  plainText: string;
  eventDate?: string | null;
  store?: ChunkStore;
}): Promise<IngestTranscriptResult> {
  const supabase = createAdminClient();
  const store = input.store ?? (supabase ? createSupabaseChunkStore(supabase) : null);

  if (!store) {
    return {
      syntheticAccession: input.syntheticAccession,
      chunksStored: 0,
      embedCalls: 0,
      skippedDuplicate: false,
    };
  }

  const proseSections = buildTranscriptSections(input.plainText);
  const chunks = chunkSections({
    companyId: input.company.edgar_id,
    accession: input.syntheticAccession,
    periodEnd: input.eventDate ?? null,
    proseSections,
    audited: false,
  });

  await store.upsertIngestStatus({
    companyId: input.company.edgar_id,
    accession: input.syntheticAccession,
    chunksDone: true,
  });

  const embedder = createEmbeddingClient();
  const result = await embedAndStore(store, {
    companyId: input.company.edgar_id,
    accession: input.syntheticAccession,
    chunks,
    embedder,
  });

  return {
    syntheticAccession: input.syntheticAccession,
    chunksStored: result.stored,
    embedCalls: result.embedCalls,
    skippedDuplicate: result.skippedDuplicate,
  };
}
