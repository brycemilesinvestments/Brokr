import type { ProseSectionKey, ProseSectionSource } from "@/lib/edgar/discovery";
import type { MetricSeriesBundle } from "@/lib/edgar/time-series";

export type QuestionRoute = "numeric" | "qualitative" | "mixed";

export type FilingChunk = {
  id?: string;
  companyId: string;
  accession: string;
  sectionType: ProseSectionKey;
  periodEnd: string | null;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  embedding?: number[];
  documentId?: number;
  /** K3 / K12 — sourced from filing form type. */
  audited?: boolean;
  /** K1 — extraction path for chat provenance. */
  source?: ProseSectionSource;
};

export type StructuredMetric = {
  id?: string;
  companyId: string;
  metricName: string;
  displayName: string;
  periodEnd: string;
  fp?: string;
  fy?: number;
  value: number;
  unit?: string;
  accession?: string;
  /** K3 — true when sourced from audited 10-K filing. */
  audited?: boolean;
};

export type IngestStatus = {
  companyId: string;
  accession: string;
  chunksDone: boolean;
  embeddedDone: boolean;
  structuredDone: boolean;
};

export type RetrievedChunk = FilingChunk & {
  similarity: number;
};

export type Citation = {
  accession: string;
  periodEnd: string | null;
  sectionType: string;
  claim: string;
};

export type RagContext = {
  companyId: string;
  companyName: string;
  periodEnd: string | null;
  metrics: StructuredMetric[];
  chunks: RetrievedChunk[];
  anomalies: Array<{ metric: string; periodEnd: string; description: string }>;
  cachedExplanations: Array<{ category: string; summary: string }>;
  tokenBudget: number;
  estimatedTokens: number;
};

export type GroundedAnswer = {
  answer: string;
  citations: Citation[];
  refused: boolean;
  route: QuestionRoute;
  metricsUsed: StructuredMetric[];
  costUsd: number;
  embedCalls: number;
};

export type RagChatInput = {
  companyId: string;
  companyName: string;
  question: string;
  periodEnd?: string | null;
  metricBundle?: MetricSeriesBundle;
  companyFacts?: import("@/lib/edgar/types").CompanyFactsResponse;
  anomalies?: RagContext["anomalies"];
  cachedExplanations?: RagContext["cachedExplanations"];
};

export type EmbedStats = {
  embedCalls: number;
  chunksEmbedded: number;
  skippedDuplicate: boolean;
};
