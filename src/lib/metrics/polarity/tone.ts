import type { MetricPolarity } from "@/lib/metrics/polarity/types";

export type MetricSentiment = "positive" | "negative" | "neutral";

export type TrendDirection = "up" | "down" | "flat";

export function deltaToneForPolarity(
  polarity: MetricPolarity,
  delta: number | undefined,
): MetricSentiment {
  if (delta === undefined || Number.isNaN(delta) || delta === 0) return "neutral";
  if (polarity === "neutral") return "neutral";

  const favorable =
    polarity === "higher_better" ? delta > 0 : delta < 0;

  return favorable ? "positive" : "negative";
}

export function trendDirectionFromValues(
  first: number | undefined,
  last: number | undefined,
): TrendDirection {
  if (first === undefined || last === undefined || Number.isNaN(first) || Number.isNaN(last)) {
    return "flat";
  }
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
}

export function sentimentFromTrend(
  polarity: MetricPolarity,
  trend: TrendDirection,
): MetricSentiment {
  if (trend === "flat" || polarity === "neutral") return "neutral";
  if (polarity === "higher_better") {
    return trend === "up" ? "positive" : "negative";
  }
  return trend === "up" ? "negative" : "positive";
}

export const SENTIMENT_CHART_COLORS: Record<MetricSentiment, string> = {
  positive: "#059669",
  negative: "#dc2626",
  neutral: "#71717a",
};
