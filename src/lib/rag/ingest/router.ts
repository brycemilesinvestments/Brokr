import { locateProseSections } from "@/lib/edgar/discovery";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import type { EmbeddingClient } from "@/lib/rag/embed/client";
import { chunkSections } from "@/lib/rag/ingest/chunk-sections";
import { indexStructured } from "@/lib/rag/ingest/index-structured";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import { embedAndStore } from "@/lib/rag/store/chunk-store";
import type { FilingChunk } from "@/lib/rag/types";

export type IngestFilingInput = {
  companyId: string;
  accession: string;
  periodEnd: string | null;
  ixbrlFacts: XbrlFact[];
  metricBundle: MetricSeriesBundle;
  companyFacts?: import("@/lib/edgar/types").CompanyFactsResponse;
};

export type IngestFilingResult = {
  chunks: FilingChunk[];
  embedCalls: number;
  indexed: number;
};

/** Router — run missing ingest steps (chunk → embed → index) deterministically before paid steps. */
export async function ingestFiling(
  store: ChunkStore,
  embedder: EmbeddingClient,
  input: IngestFilingInput,
): Promise<IngestFilingResult> {
  const status = await store.getIngestStatus(input.companyId, input.accession);
  let chunks: FilingChunk[] = [];
  let embedCalls = 0;
  let indexed = 0;

  if (!status?.chunksDone) {
    const proseSections = locateProseSections(input.ixbrlFacts);
    chunks = chunkSections({
      companyId: input.companyId,
      accession: input.accession,
      periodEnd: input.periodEnd,
      proseSections,
    });
    await store.upsertIngestStatus({
      companyId: input.companyId,
      accession: input.accession,
      chunksDone: true,
    });
  }

  if (!status?.embeddedDone) {
    if (chunks.length === 0) {
      const proseSections = locateProseSections(input.ixbrlFacts);
      chunks = chunkSections({
        companyId: input.companyId,
        accession: input.accession,
        periodEnd: input.periodEnd,
        proseSections,
      });
    }
    const embedResult = await embedAndStore(store, {
      companyId: input.companyId,
      accession: input.accession,
      chunks,
      embedder,
    });
    embedCalls += embedResult.embedCalls;
  }

  if (!status?.structuredDone) {
    const result = await indexStructured(store, {
      companyId: input.companyId,
      accession: input.accession,
      bundle: input.metricBundle,
      companyFacts: input.companyFacts,
      replaceCompany: true,
    });
    indexed = result.indexed;
  }

  return { chunks, embedCalls, indexed };
}
