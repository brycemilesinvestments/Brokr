import { CONTEXT_TOKEN_BUDGET } from "@/lib/rag/constants";
import { formatMetricForContext } from "@/lib/rag/query/pull-metrics";
import type { RagContext } from "@/lib/rag/types";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Q3 — Assemble token-budgeted context from metrics, prose, anomalies. */
export function buildContext(input: {
  companyId: string;
  companyName: string;
  periodEnd?: string | null;
  metrics: RagContext["metrics"];
  chunks: RagContext["chunks"];
  anomalies?: RagContext["anomalies"];
  cachedExplanations?: RagContext["cachedExplanations"];
  tokenBudget?: number;
}): RagContext {
  const budget = input.tokenBudget ?? CONTEXT_TOKEN_BUDGET;
  let used = estimateTokens(input.companyName) + 50;

  const metricsBlock = input.metrics.map(formatMetricForContext).join("\n");
  used += estimateTokens(metricsBlock);

  const sortedChunks = input.chunks.toSorted((a, b) => b.similarity - a.similarity);
  const keptChunks: RagContext["chunks"] = [];

  for (const chunk of sortedChunks) {
    const chunkTokens = estimateTokens(chunk.text);
    if (used + chunkTokens > budget) continue;
    keptChunks.push(chunk);
    used += chunkTokens;
  }

  const anomalies = (input.anomalies ?? []).slice(0, 5);
  for (const anomaly of anomalies) {
    used += estimateTokens(anomaly.description);
  }

  const cachedExplanations = (input.cachedExplanations ?? []).slice(0, 3);
  for (const explanation of cachedExplanations) {
    used += estimateTokens(explanation.summary);
  }

  return {
    companyId: input.companyId,
    companyName: input.companyName,
    periodEnd: input.periodEnd ?? null,
    metrics: input.metrics,
    chunks: keptChunks,
    anomalies,
    cachedExplanations,
    tokenBudget: budget,
    estimatedTokens: used,
  };
}

export function contextToPrompt(context: RagContext, route: string): string {
  const lines: string[] = [
    `Company: ${context.companyName} (CIK ${context.companyId})`,
    `In-view period: ${context.periodEnd ?? "latest available"}`,
    `Question route: ${route}`,
    "",
    "STRUCTURED METRICS (authoritative for all numbers — do NOT read numbers from prose):",
  ];

  if (context.metrics.length === 0) {
    lines.push("- No matching structured metrics found.");
  } else {
    for (const metric of context.metrics) {
      lines.push(`- ${formatMetricForContext(metric)}`);
    }
  }

  if (context.anomalies.length > 0) {
    lines.push("", "FLAGGED ANOMALIES:");
    for (const anomaly of context.anomalies) {
      lines.push(`- ${anomaly.metric} (${anomaly.periodEnd}): ${anomaly.description}`);
    }
  }

  if (context.cachedExplanations.length > 0) {
    lines.push("", "CACHED EXPLANATIONS:");
    for (const explanation of context.cachedExplanations) {
      lines.push(`- [${explanation.category}] ${explanation.summary}`);
    }
  }

  lines.push("", "FILING PROSE (for narrative claims only — cite accession + period + section):");
  if (context.chunks.length === 0) {
    lines.push("- No relevant prose chunks retrieved.");
  } else {
    for (const chunk of context.chunks) {
      lines.push(
        `--- [accession:${chunk.accession}|period:${chunk.periodEnd ?? "n/a"}|section:${chunk.sectionType}] ---`,
      );
      lines.push(chunk.text);
    }
  }

  return lines.join("\n");
}
