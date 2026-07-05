export type {
  MetricPolarity,
  MetricPolarityDefinition,
  MetricPolarityMap,
} from "@/lib/metrics/polarity/types";

export { guessPolarityFromMetricKey } from "@/lib/metrics/polarity/heuristics";

export {
  deltaToneForPolarity,
  trendDirectionFromValues,
  sentimentFromTrend,
  SENTIMENT_CHART_COLORS,
} from "@/lib/metrics/polarity/tone";

export type { MetricSentiment, TrendDirection } from "@/lib/metrics/polarity/tone";
