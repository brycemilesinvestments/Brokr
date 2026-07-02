import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmbeddingClient } from "@/lib/rag/embed/client";
import type {
  FilingChunk,
  IngestStatus,
  RetrievedChunk,
  StructuredMetric,
} from "@/lib/rag/types";
import { cosineSimilarity } from "@/lib/rag/embed/local-embed";

export type ChunkStore = {
  getIngestStatus(companyId: string, accession: string): Promise<IngestStatus | null>;
  upsertIngestStatus(status: Partial<IngestStatus> & { companyId: string; accession: string }): Promise<void>;
  deleteChunksForAccession(companyId: string, accession: string): Promise<void>;
  insertChunks(chunks: FilingChunk[]): Promise<void>;
  hasChunksForAccession(companyId: string, accession: string): Promise<boolean>;
  searchChunks(input: {
    companyId: string;
    queryEmbedding: number[];
    topK: number;
    periodEnd?: string | null;
    audited?: boolean | null;
  }): Promise<RetrievedChunk[]>;
  deleteMetricsForCompany(companyId: string): Promise<void>;
  upsertMetrics(metrics: StructuredMetric[]): Promise<void>;
  queryMetrics(input: {
    companyId: string;
    metricNames?: string[];
    periodEnd?: string | null;
    fp?: string | null;
  }): Promise<StructuredMetric[]>;
};

export class MemoryChunkStore implements ChunkStore {
  private ingest = new Map<string, IngestStatus>();
  private chunks: FilingChunk[] = [];
  private metrics: StructuredMetric[] = [];

  private key(companyId: string, accession: string) {
    return `${companyId}:${accession}`;
  }

  async getIngestStatus(companyId: string, accession: string) {
    return this.ingest.get(this.key(companyId, accession)) ?? null;
  }

  async upsertIngestStatus(status: Partial<IngestStatus> & { companyId: string; accession: string }) {
    const existing = this.ingest.get(this.key(status.companyId, status.accession));
    this.ingest.set(this.key(status.companyId, status.accession), {
      companyId: status.companyId,
      accession: status.accession,
      chunksDone: status.chunksDone ?? existing?.chunksDone ?? false,
      embeddedDone: status.embeddedDone ?? existing?.embeddedDone ?? false,
      structuredDone: status.structuredDone ?? existing?.structuredDone ?? false,
    });
  }

  async deleteChunksForAccession(companyId: string, accession: string) {
    this.chunks = this.chunks.filter(
      (c) => !(c.companyId === companyId && c.accession === accession),
    );
  }

  async insertChunks(chunks: FilingChunk[]) {
    this.chunks.push(...chunks);
  }

  async hasChunksForAccession(companyId: string, accession: string) {
    return this.chunks.some((c) => c.companyId === companyId && c.accession === accession);
  }

  async searchChunks({
    companyId,
    queryEmbedding,
    topK,
    periodEnd,
    audited,
  }: Parameters<ChunkStore["searchChunks"]>[0]) {
    const scoped = this.chunks.filter((chunk) => {
      if (chunk.companyId !== companyId) return false;
      if (periodEnd && chunk.periodEnd !== periodEnd) return false;
      if (audited != null && chunk.audited !== audited) return false;
      return Array.isArray(chunk.embedding);
    });

    return scoped
      .map((chunk) => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding ?? []),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async deleteMetricsForCompany(companyId: string) {
    this.metrics = this.metrics.filter((m) => m.companyId !== companyId);
  }

  async upsertMetrics(rows: StructuredMetric[]) {
    for (const row of rows) {
      const idx = this.metrics.findIndex(
        (m) =>
          m.companyId === row.companyId &&
          m.metricName === row.metricName &&
          m.periodEnd === row.periodEnd &&
          m.fp === row.fp,
      );
      if (idx >= 0) this.metrics[idx] = row;
      else this.metrics.push(row);
    }
  }

  async queryMetrics({
    companyId,
    metricNames,
    periodEnd,
    fp,
  }: Parameters<ChunkStore["queryMetrics"]>[0]) {
    return this.metrics.filter((m) => {
      if (m.companyId !== companyId) return false;
      if (metricNames?.length && !metricNames.includes(m.metricName)) return false;
      if (periodEnd && m.periodEnd !== periodEnd) return false;
      if (fp && m.fp !== fp) return false;
      return true;
    });
  }
}

export function createSupabaseChunkStore(client: SupabaseClient): ChunkStore {
  return {
    async getIngestStatus(companyId, accession) {
      const { data } = await client
        .from("filing_ingest_status")
        .select("*")
        .eq("company_id", companyId)
        .eq("accession", accession)
        .maybeSingle();

      if (!data) return null;
      return {
        companyId: data.company_id,
        accession: data.accession,
        chunksDone: data.chunks_done,
        embeddedDone: data.embedded_done,
        structuredDone: data.structured_done,
      };
    },

    async upsertIngestStatus(status) {
      await client.from("filing_ingest_status").upsert({
        company_id: status.companyId,
        accession: status.accession,
        chunks_done: status.chunksDone,
        embedded_done: status.embeddedDone,
        structured_done: status.structuredDone,
        updated_at: new Date().toISOString(),
      });
    },

    async deleteChunksForAccession(companyId, accession) {
      await client
        .from("filing_chunks")
        .delete()
        .eq("company_id", companyId)
        .eq("accession", accession);
    },

    async insertChunks(chunks) {
      if (chunks.length === 0) return;
      await client.from("filing_chunks").insert(
        chunks.map((chunk) => ({
          company_id: chunk.companyId,
          accession: chunk.accession,
          section_type: chunk.sectionType,
          period_end: chunk.periodEnd,
          chunk_index: chunk.chunkIndex,
          text: chunk.text,
          embedding: chunk.embedding,
          token_count: chunk.tokenCount,
          document_id: chunk.documentId ?? null,
          audited: chunk.audited ?? false,
          source: chunk.source ?? "ixbrl_textblock",
        })),
      );
    },

    async hasChunksForAccession(companyId, accession) {
      const { count } = await client
        .from("filing_chunks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("accession", accession);
      return (count ?? 0) > 0;
    },

    async searchChunks({ companyId, queryEmbedding, topK, periodEnd, audited }) {
      const { data, error } = await client.rpc("match_filing_chunks", {
        query_embedding: queryEmbedding,
        match_company_id: companyId,
        match_count: topK,
        match_period_end: periodEnd ?? null,
        match_audited: audited ?? null,
      });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        companyId: String(row.company_id),
        accession: String(row.accession),
        sectionType: row.section_type as RetrievedChunk["sectionType"],
        periodEnd: (row.period_end as string | null) ?? null,
        chunkIndex: Number(row.chunk_index),
        text: String(row.text),
        tokenCount: 0,
        audited: row.audited === true,
        source: (row.source as RetrievedChunk["source"]) ?? "ixbrl_textblock",
        similarity: Number(row.similarity),
      }));
    },

    async deleteMetricsForCompany(companyId) {
      await client.from("structured_metrics").delete().eq("company_id", companyId);
    },

    async upsertMetrics(rows) {
      if (rows.length === 0) return;
      await client.from("structured_metrics").upsert(
        rows.map((row) => ({
          company_id: row.companyId,
          metric_name: row.metricName,
          display_name: row.displayName,
          period_end: row.periodEnd,
          fp: row.fp ?? null,
          fy: row.fy ?? null,
          value: row.value,
          unit: row.unit ?? null,
          accession: row.accession ?? null,
          audited: row.audited ?? false,
        })),
        { onConflict: "company_id,metric_name,period_end,fp" },
      );
    },

    async queryMetrics({ companyId, metricNames, periodEnd, fp }) {
      let query = client.from("structured_metrics").select("*").eq("company_id", companyId);
      if (metricNames?.length) query = query.in("metric_name", metricNames);
      if (periodEnd) query = query.eq("period_end", periodEnd);
      if (fp) query = query.eq("fp", fp);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data ?? []).map((row) => ({
        id: row.id,
        companyId: row.company_id,
        metricName: row.metric_name,
        displayName: row.display_name,
        periodEnd: row.period_end,
        fp: row.fp ?? undefined,
        fy: row.fy ?? undefined,
        value: Number(row.value),
        unit: row.unit ?? undefined,
        accession: row.accession ?? undefined,
        audited: row.audited === true,
      }));
    },
  };
}

export type EmbedAndStoreInput = {
  companyId: string;
  accession: string;
  chunks: FilingChunk[];
  embedder: EmbeddingClient;
};

export type EmbedAndStoreResult = {
  stored: number;
  embedCalls: number;
  skippedDuplicate: boolean;
};

/** I2 — Embed chunks once and store in pgvector; idempotent per accession. */
export async function embedAndStore(
  store: ChunkStore,
  input: EmbedAndStoreInput,
): Promise<EmbedAndStoreResult> {
  const alreadyEmbedded = await store.hasChunksForAccession(input.companyId, input.accession);
  if (alreadyEmbedded) {
    await store.upsertIngestStatus({
      companyId: input.companyId,
      accession: input.accession,
      embeddedDone: true,
    });
    return { stored: 0, embedCalls: 0, skippedDuplicate: true };
  }

  if (input.chunks.length === 0) {
    await store.upsertIngestStatus({
      companyId: input.companyId,
      accession: input.accession,
      embeddedDone: true,
    });
    return { stored: 0, embedCalls: 0, skippedDuplicate: false };
  }

  const embeddings = await input.embedder.embedBatch(
    input.chunks.map((c) => c.text),
    "document",
  );
  const withEmbeddings = input.chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));

  await store.deleteChunksForAccession(input.companyId, input.accession);
  await Promise.all([
    store.insertChunks(withEmbeddings),
    store.upsertIngestStatus({
      companyId: input.companyId,
      accession: input.accession,
      embeddedDone: true,
    }),
  ]);

  return {
    stored: withEmbeddings.length,
    embedCalls: 1,
    skippedDuplicate: false,
  };
}
