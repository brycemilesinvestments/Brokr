import type { Anomaly, AnomalySeverity, Financials, Ratios } from "@/lib/analysis/types";
import { revenueYoYRatio } from "@/lib/analysis/deltas";
import { computeRatios } from "@/lib/analysis/ratios";
import {
  DEFAULT_THRESHOLDS,
  exceedsThreshold,
  isBelowFloor,
  type ThresholdConfig,
} from "@/lib/analysis/thresholds";

function severityForSwing(swing: number, threshold: number): AnomalySeverity {
  const ratio = Math.abs(swing) / threshold;
  if (ratio >= 2) return "high";
  if (ratio >= 1) return "medium";
  return "low";
}

export function detectAnomalies(
  financials: Financials,
  ratios: Ratios = computeRatios(financials),
  config: ThresholdConfig = DEFAULT_THRESHOLDS,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (ratios.grossMargin !== undefined && financials.priorRevenue !== undefined) {
    const priorMargin =
      financials.priorGrossProfit !== undefined && financials.priorRevenue
        ? financials.priorGrossProfit / financials.priorRevenue
        : undefined;

    if (priorMargin !== undefined) {
      const swing = ratios.grossMargin - priorMargin;
      if (exceedsThreshold(swing, config.grossMarginSwing)) {
        anomalies.push({
          metric: "grossMargin",
          severity: severityForSwing(swing, config.grossMarginSwing),
          message: `Gross margin swing of ${(swing * 100).toFixed(1)}pp exceeds threshold`,
          value: ratios.grossMargin,
          threshold: config.grossMarginSwing,
        });
      }
    }
  }

  const yoy = revenueYoYRatio(financials);
  if (yoy !== undefined) {
    const growthRatio = yoy - 1;
    if (exceedsThreshold(growthRatio, config.revenueYoYSwing)) {
      anomalies.push({
        metric: "revenueYoY",
        severity: severityForSwing(growthRatio, config.revenueYoYSwing),
        message: `Revenue YoY ratio change ${growthRatio.toFixed(2)} exceeds threshold`,
        value: yoy,
        threshold: config.revenueYoYSwing,
      });
    }
  }

  if (isBelowFloor(ratios.netMargin, config.netMarginFloor)) {
    anomalies.push({
      metric: "netMargin",
      severity: "medium",
      message: "Net margin below floor",
      value: ratios.netMargin,
      threshold: config.netMarginFloor,
    });
  }

  return anomalies;
}

export function analyzeFinancials(financials: Financials): {
  ratios: Ratios;
  anomalies: Anomaly[];
} {
  const ratios = computeRatios(financials);
  const anomalies = detectAnomalies(financials, ratios);
  return { ratios, anomalies };
}
