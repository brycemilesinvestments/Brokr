import { createAiClient, parseJsonFromText, type AiClient } from "@/lib/ai";
import type { MetricPolarity } from "@/lib/metrics/polarity/types";
import { guessPolarityFromMetricKey } from "@/lib/metrics/polarity/heuristics";
import {
  buildMetricPolarityPrompt,
  METRIC_POLARITY_SYSTEM_PROMPT,
} from "@/lib/agent/metric-polarity/prompts";
import type {
  MetricPolarityBatchResult,
  MetricPolarityClassifyInput,
  MetricPolarityClassification,
} from "@/lib/agent/metric-polarity/types";

const VALID_POLARITIES = new Set<MetricPolarity>([
  "higher_better",
  "lower_better",
  "neutral",
]);

function heuristicClassification(
  metric: MetricPolarityClassifyInput,
): MetricPolarityClassification {
  return {
    metricKey: metric.metricKey,
    displayName: metric.displayName,
    polarity: guessPolarityFromMetricKey(metric.metricKey),
    category: "other",
    reasoning: "Heuristic fallback based on metric name patterns.",
  };
}

function parseBatchResponse(
  raw: unknown,
  inputs: MetricPolarityClassifyInput[],
): MetricPolarityClassification[] {
  if (!raw || typeof raw !== "object") return [];
  const metrics = (raw as { metrics?: unknown }).metrics;
  if (!Array.isArray(metrics)) return [];

  const byKey = new Map<string, MetricPolarityClassification>();

  const inputsByKey = new Map(inputs.map((item) => [item.metricKey, item] as const));

  for (const entry of metrics) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const metricKey = typeof obj.metricKey === "string" ? obj.metricKey : "";
    if (!metricKey) continue;

    const polarity =
      typeof obj.polarity === "string" && VALID_POLARITIES.has(obj.polarity as MetricPolarity)
        ? (obj.polarity as MetricPolarity)
        : guessPolarityFromMetricKey(metricKey);

    const input = inputsByKey.get(metricKey);
    byKey.set(metricKey, {
      metricKey,
      displayName:
        typeof obj.displayName === "string" && obj.displayName.length > 0
          ? obj.displayName
          : (input?.displayName ?? metricKey),
      polarity,
      category: typeof obj.category === "string" ? obj.category : "other",
      reasoning:
        typeof obj.reasoning === "string"
          ? obj.reasoning
          : "AI classification based on standard financial interpretation.",
    });
  }

  return [...byKey.values()];
}

async function llmBatchPass(
  ai: AiClient,
  metrics: MetricPolarityClassifyInput[],
): Promise<{ classifications: MetricPolarityClassification[]; costUsd: number }> {
  const response = await ai.complete({
    max_tokens: Math.min(2048, 120 + metrics.length * 80),
    system: METRIC_POLARITY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildMetricPolarityPrompt(metrics) }],
  });

  const text = response.content.find((block) => block.type === "text")?.text ?? "";
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const costUsd = ai.estimateCostUsd(inputTokens, outputTokens);

  let parsed: unknown;
  try {
    parsed = parseJsonFromText(text);
  } catch {
    return { classifications: [], costUsd };
  }

  return { classifications: parseBatchResponse(parsed, metrics), costUsd };
}

/** Classify metric polarities via LLM, with heuristic fallback per metric. */
export async function classifyMetricPolarities(
  metrics: MetricPolarityClassifyInput[],
): Promise<MetricPolarityBatchResult> {
  if (metrics.length === 0) {
    return { classifications: [], costUsd: 0, usedLlm: false };
  }

  let ai: AiClient | null = null;
  try {
    ai = createAiClient();
  } catch {
    ai = null;
  }

  if (ai) {
    const { classifications, costUsd } = await llmBatchPass(ai, metrics);
    if (classifications.length > 0) {
      const byKey = new Map(classifications.map((item) => [item.metricKey, item]));
      const merged = metrics.map(
        (metric) => byKey.get(metric.metricKey) ?? heuristicClassification(metric),
      );
      return { classifications: merged, costUsd, usedLlm: true };
    }
  }

  return {
    classifications: metrics.map(heuristicClassification),
    costUsd: 0,
    usedLlm: false,
  };
}
