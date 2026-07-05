import type { ChartBundle } from "@/lib/analysis";
import { classifyMetricPolarities } from "@/lib/agent/metric-polarity/classify";
import type { AiClient } from "@/lib/ai";
import { guessPolarityFromMetricKey } from "@/lib/metrics/polarity/heuristics";
import type { MetricPolarityMap } from "@/lib/metrics/polarity/types";
import {
  getMetricDefinitionsByKeys,
  linkStructuredMetricsToDefinitions,
  upsertMetricDefinitions,
} from "@/lib/supabase/metric-definitions";

function displayNameForMetric(metricKey: string): string {
  if (metricKey.startsWith("end_market:") || metricKey.startsWith("geography:")) {
    return metricKey.split(":").slice(1).join(":");
  }
  if (metricKey.includes("_")) return metricKey.replace(/_/g, " ");
  return metricKey.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function collectMetricKeys(charts: ChartBundle[]): string[] {
  const keys = new Set<string>();
  for (const chart of charts) {
    for (const key of Object.keys(chart)) {
      if ((chart[key]?.length ?? 0) > 0) keys.add(key);
    }
  }
  return [...keys];
}

function heuristicMap(metricKeys: string[]): MetricPolarityMap {
  return Object.fromEntries(
    metricKeys.map((metricKey) => [
      metricKey,
      {
        metricKey,
        displayName: displayNameForMetric(metricKey),
        polarity: guessPolarityFromMetricKey(metricKey),
        classifiedBy: "heuristic" as const,
      },
    ]),
  );
}

export type ResolveMetricPolaritiesResult = {
  polarities: MetricPolarityMap;
  costUsd: number;
};

/** Resolve polarities from DB cache; classify and persist any missing metric keys once. */
export async function resolveMetricPolarities(
  charts: ChartBundle[],
  _ai?: AiClient,
): Promise<ResolveMetricPolaritiesResult> {
  const metricKeys = collectMetricKeys(charts);
  if (metricKeys.length === 0) {
    return { polarities: {}, costUsd: 0 };
  }

  const existing = await getMetricDefinitionsByKeys(metricKeys);
  const existingKeys = new Set(existing.map((item) => item.metricKey));
  const missingKeys = metricKeys.filter((key) => !existingKeys.has(key));

  let costUsd = 0;
  let newlyClassified = existing;

  if (missingKeys.length > 0) {
    const batch = await classifyMetricPolarities(
      missingKeys.map((metricKey) => ({
        metricKey,
        displayName: displayNameForMetric(metricKey),
      })),
    );
    costUsd += batch.costUsd;

    const toStore = batch.classifications.map((item) => ({
      metricKey: item.metricKey,
      displayName: item.displayName,
      polarity: item.polarity,
      category: item.category,
      reasoning: item.reasoning,
      classifiedBy: batch.usedLlm ? ("ai" as const) : ("heuristic" as const),
      model: batch.usedLlm ? process.env.CLAUDE_ANALYSIS_MODEL : undefined,
    }));

    newlyClassified = [...existing, ...(await upsertMetricDefinitions(toStore))];
    void linkStructuredMetricsToDefinitions(missingKeys);
  }

  if (newlyClassified.length === 0) {
    return { polarities: heuristicMap(metricKeys), costUsd };
  }

  const polarities: MetricPolarityMap = Object.fromEntries(
    newlyClassified.map((definition) => [definition.metricKey, definition]),
  );

  for (const metricKey of metricKeys) {
    if (!polarities[metricKey]) {
      polarities[metricKey] = {
        metricKey,
        displayName: displayNameForMetric(metricKey),
        polarity: guessPolarityFromMetricKey(metricKey),
        classifiedBy: "heuristic",
      };
    }
  }

  return { polarities, costUsd };
}
