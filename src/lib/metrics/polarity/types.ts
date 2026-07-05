/** Whether an increase in the metric value is favorable for investors. */
export type MetricPolarity = "higher_better" | "lower_better" | "neutral";

export type MetricPolarityDefinition = {
  metricKey: string;
  displayName: string;
  polarity: MetricPolarity;
  category?: string;
  reasoning?: string;
  classifiedBy: "ai" | "heuristic" | "manual";
};

export type MetricPolarityMap = Record<string, MetricPolarityDefinition>;
