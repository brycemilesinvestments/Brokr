import type { ChartBundle, ChartPoint } from "@/lib/analysis";
import type { AnalysisCategory } from "../constants";
import { ANALYSIS_CATEGORY_LABELS, ANALYSIS_METRIC_SECTIONS } from "../constants";

export type MetricSeriesSection = {
  category: AnalysisCategory;
  categoryLabel: string;
  subcategory: string;
  metrics: string[];
};

export function latestQuarterlyPoint(
  chart: ChartBundle,
  metric: string,
): ChartPoint | undefined {
  const points = chart[metric]?.filter((point) => point.frequency === "quarterly") ?? [];
  return points[points.length - 1];
}

export function sparklinePoints(chart: ChartBundle, metric: string, limit = 8): ChartPoint[] {
  const points = chart[metric]?.filter((point) => point.frequency === "quarterly") ?? [];
  return points.slice(-limit);
}

export function buildMetricSeriesSections(chart: ChartBundle): MetricSeriesSection[] {
  const sections: MetricSeriesSection[] = [];

  for (const section of ANALYSIS_METRIC_SECTIONS) {
    for (const group of section.groups) {
      const metrics = group.metrics.filter((metric) => (chart[metric]?.length ?? 0) > 0);
      if (metrics.length === 0) continue;

      sections.push({
        category: section.category,
        categoryLabel: ANALYSIS_CATEGORY_LABELS[section.category],
        subcategory: group.label,
        metrics,
      });
    }
  }

  const segmentMetrics = Object.keys(chart).filter(
    (key) =>
      (key.startsWith("end_market:") || key.startsWith("geography:")) &&
      (chart[key]?.length ?? 0) > 0,
  );

  if (segmentMetrics.length > 0) {
    sections.push({
      category: "extended",
      categoryLabel: ANALYSIS_CATEGORY_LABELS.extended,
      subcategory: "Segments",
      metrics: segmentMetrics,
    });
  }

  return sections;
}

export function mergeAnalysisCharts(input: {
  fundamentals: ChartBundle;
  extended: ChartBundle;
  valuation?: ChartBundle;
}): ChartBundle {
  return {
    ...input.fundamentals,
    ...input.extended,
    ...(input.valuation ?? {}),
  };
}
