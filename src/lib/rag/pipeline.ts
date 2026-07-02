import type { AiClient } from "@/lib/ai/client";
import type { EmbeddingClient } from "@/lib/rag/embed/client";
import { ingestFiling } from "@/lib/rag/ingest/router";
import { buildContext } from "@/lib/rag/query/build-context";
import { groundedGenerate } from "@/lib/rag/query/grounded-generate";
import { pullMetrics } from "@/lib/rag/query/pull-metrics";
import { routeQuestion } from "@/lib/rag/query/route-question";
import { vectorSearch } from "@/lib/rag/query/vector-search";
import type { ChunkStore } from "@/lib/rag/store/chunk-store";
import type { GroundedAnswer, RagChatInput } from "@/lib/rag/types";
import type { XbrlFact } from "@/lib/edgar/xbrl/types";

export type RagPipelineDeps = {
  store: ChunkStore;
  embedder: EmbeddingClient;
  ai: AiClient;
};

export type RagChatDeps = RagPipelineDeps & {
  ixbrlFacts?: XbrlFact[];
  accession?: string;
  periodEnd?: string | null;
};

/** Full per-question pipeline: route → retrieve → assemble → generate. */
export async function runRagChat(
  deps: RagChatDeps,
  input: RagChatInput,
): Promise<GroundedAnswer> {
  let totalEmbedCalls = 0;

  if (deps.ixbrlFacts && deps.accession && input.metricBundle) {
    const ingestResult = await ingestFiling(deps.store, deps.embedder, {
      companyId: input.companyId,
      accession: deps.accession,
      periodEnd: deps.periodEnd ?? input.periodEnd ?? null,
      ixbrlFacts: deps.ixbrlFacts,
      metricBundle: input.metricBundle,
      companyFacts: input.companyFacts,
    });
    totalEmbedCalls += ingestResult.embedCalls;
  }

  const route = routeQuestion(input.question);
  const periodEnd = input.periodEnd ?? deps.periodEnd ?? null;

  let metrics = [] as Awaited<ReturnType<typeof pullMetrics>>;
  if (route === "numeric" || route === "mixed") {
    metrics = await pullMetrics(deps.store, {
      companyId: input.companyId,
      question: input.question,
      periodEnd,
    });
  }

  let chunks: Awaited<ReturnType<typeof vectorSearch>>["chunks"] = [];
  if (route === "qualitative" || route === "mixed") {
    const searchResult = await vectorSearch(deps.store, deps.embedder, {
      companyId: input.companyId,
      question: input.question,
      periodEnd,
    });
    chunks = searchResult.chunks;
    totalEmbedCalls += searchResult.embedCalls;
  }

  const context = buildContext({
    companyId: input.companyId,
    companyName: input.companyName,
    periodEnd,
    metrics,
    chunks,
    anomalies: input.anomalies,
    cachedExplanations: input.cachedExplanations,
  });

  const generated = await groundedGenerate(deps.ai, {
    question: input.question,
    context,
    route,
    metricsUsed: metrics,
  });

  return {
    ...generated,
    route,
    metricsUsed: metrics,
    embedCalls: totalEmbedCalls,
  };
}
