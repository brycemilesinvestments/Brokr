export type {
  Citation,
  EmbedStats,
  FilingChunk,
  GroundedAnswer,
  IngestStatus,
  QuestionRoute,
  RagChatInput,
  RagContext,
  RetrievedChunk,
  StructuredMetric,
} from "@/lib/rag/types";

export {
  EMBEDDING_DIMENSIONS,
  NOT_DISCLOSED_PHRASE,
  REVENUE_CONCEPT,
  VECTOR_TOP_K,
  VOYAGE_EMBEDDING_MODEL,
} from "@/lib/rag/constants";

export {
  createEmbeddingClient,
  createLocalEmbeddingClient,
  type EmbeddingClient,
  type EmbeddingInputType,
} from "@/lib/rag/embed/client";

export { embedTextLocal, cosineSimilarity } from "@/lib/rag/embed/local-embed";

export { chunkSections } from "@/lib/rag/ingest/chunk-sections";
export { indexStructured } from "@/lib/rag/ingest/index-structured";
export { ingestFiling } from "@/lib/rag/ingest/router";

export {
  MemoryChunkStore,
  createSupabaseChunkStore,
  embedAndStore,
  type ChunkStore,
} from "@/lib/rag/store/chunk-store";

export { routeQuestion, extractMetricHints, extractFpHint } from "@/lib/rag/query/route-question";
export { pullMetrics, formatMetricForContext, formatValue } from "@/lib/rag/query/pull-metrics";
export { vectorSearch } from "@/lib/rag/query/vector-search";
export { buildContext, contextToPrompt } from "@/lib/rag/query/build-context";
export { groundedGenerate, buildPromptForInspection } from "@/lib/rag/query/grounded-generate";

export { runRagChat, type RagChatDeps, type RagPipelineDeps } from "@/lib/rag/pipeline";
