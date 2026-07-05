import type { MetricPolarity } from "@/lib/metrics/polarity/types";

export type MetricPolarityClassifyInput = {
  metricKey: string;
  displayName: string;
};

export type MetricPolarityClassification = {
  metricKey: string;
  displayName: string;
  polarity: MetricPolarity;
  category: string;
  reasoning: string;
};

export type MetricPolarityBatchResult = {
  classifications: MetricPolarityClassification[];
  costUsd: number;
  usedLlm: boolean;
};
