import type { EmbeddingClient } from "@/lib/rag/embed/client";
import { VECTOR_TOP_K } from "@/lib/rag/constants";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import type { RetrievedChunk } from "@/lib/rag/types";

/** Q2 — Company-scoped vector search; optional period filter. */
export async function vectorSearch(
  store: ChunkStore,
  embedder: EmbeddingClient,
  input: {
    companyId: string;
    question: string;
    periodEnd?: string | null;
    topK?: number;
  },
): Promise<{ chunks: RetrievedChunk[]; embedCalls: number }> {
  const queryEmbedding = await embedder.embed(input.question, "query");

  const chunks = await store.searchChunks({
    companyId: input.companyId,
    queryEmbedding,
    topK: input.topK ?? VECTOR_TOP_K,
    periodEnd: input.periodEnd,
  });

  return { chunks, embedCalls: 0 };
}
