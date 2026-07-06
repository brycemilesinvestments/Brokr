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
} from "@/lib/chat/types";

export {
  EMBEDDING_DIMENSIONS,
  NOT_DISCLOSED_PHRASE,
  REVENUE_CONCEPT,
  VECTOR_TOP_K,
} from "@/lib/rag/constants";

export {
  createEmbeddingClient,
  createLocalEmbeddingClient,
  type EmbeddingClient,
} from "@/lib/rag/embed/client";
export { embedTextLocal, cosineSimilarity } from "@/lib/rag/embed/local-embed";

export { chunkSections, indexStructured, ingestFiling } from "@/lib/chat/ingest";

export {
  MemoryChunkStore,
  createSupabaseChunkStore,
  embedAndStore,
  type ChunkStore,
} from "@/lib/rag/store/chunk-store";

export {
  buildContext,
  buildPromptForInspection,
  contextToPrompt,
  extractFpHint,
  extractMetricHints,
  formatMetricForContext,
  groundedGenerate,
  pullMetrics,
  routeQuestion,
  vectorSearch,
} from "@/lib/chat/query";

export { runRagChat, type RagChatDeps, type RagPipelineDeps } from "@/lib/rag/pipeline";
