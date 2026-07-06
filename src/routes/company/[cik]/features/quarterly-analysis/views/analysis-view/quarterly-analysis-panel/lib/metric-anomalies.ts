import type { AnomalyExplanation, CrossLayerAnomaly } from "@/lib/orchestrate";

const REVENUE_CONCEPT = "RevenueFromContractWithCustomerExcludingAssessedTax";

function chartKeyMatchesMetric(chartKey: string, metric: string): boolean {
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

export function explanationForAnomaly(
  anomalyId: string,
  explanations: AnomalyExplanation[],
): AnomalyExplanation | undefined {
  return explanations.find((item) => item.anomalyId === anomalyId);
}
