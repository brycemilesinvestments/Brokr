import type { ChartBundle } from "@/lib/analysis";
import type { AnomalyExplanation, CrossLayerAnomaly } from "@/lib/orchestrate";

const REVENUE_CONCEPT = "RevenueFromContractWithCustomerExcludingAssessedTax";

export function chartKeyMatchesMetric(chartKey: string, metric: string): boolean {
  if (chartKey === metric) return true;
  if (chartKey === "revenue" && metric === REVENUE_CONCEPT) return true;
  if (chartKey === REVENUE_CONCEPT && metric === "revenue") return true;
  return false;
}

export function crossAnomaliesForMetric(
  metric: string,
  anomalies: CrossLayerAnomaly[],
): CrossLayerAnomaly[] {
  return anomalies.filter((anomaly) =>
    anomaly.chartKeys.some((key) => chartKeyMatchesMetric(key, metric)),
  );
}

export function chartHasPointAnomalies(chart: ChartBundle, metric: string): boolean {
  return (chart[metric] ?? []).some((point) => point.anomaly);
}

export function metricHasAnomalies(
  metric: string,
  anomalies: CrossLayerAnomaly[],
  chart: ChartBundle,
): boolean {
  return crossAnomaliesForMetric(metric, anomalies).length > 0 || chartHasPointAnomalies(chart, metric);
}

export function explanationForAnomaly(
  anomalyId: string,
  explanations: AnomalyExplanation[],
): AnomalyExplanation | undefined {
  return explanations.find((item) => item.anomalyId === anomalyId);
}
