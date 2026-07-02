import { exceedsThreshold, isBelowFloor, DEFAULT_THRESHOLDS } from "@/lib/analysis/thresholds";
import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import type { RatioSeriesKey, RatioSeriesPoint, SeriesAnomaly } from "@/lib/analysis/time-series/types";
import { ratioSeriesForFrequency } from "@/lib/analysis/time-series/ratios";

function anomalyKey(periodEnd: string, metric: string, frequency: string): string {
  return `${frequency}:${periodEnd}:${metric}`;
}

export function detectSeriesAnomalies(
  metrics: MetricSeriesBundle,
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
): SeriesAnomaly[] {
  const seen = new Set<string>();
  const anomalies: SeriesAnomaly[] = [];

  const push = (anomaly: SeriesAnomaly) => {
    const key = anomalyKey(anomaly.periodEnd, anomaly.metric, anomaly.frequency);
    if (seen.has(key)) return;
    seen.add(key);
    anomalies.push(anomaly);
  };

  for (const frequency of ["annual", "quarterly"] as const) {
    const grossMargin = ratioSeriesForFrequency(ratioSeries, "gross_margin", frequency);
    for (let i = 1; i < grossMargin.length; i++) {
      const current = grossMargin[i];
      const prior = grossMargin[i - 1];
      if (current.value === undefined || prior.value === undefined) continue;

      const swing = current.value - prior.value;
      if (exceedsThreshold(swing, DEFAULT_THRESHOLDS.grossMarginSwing)) {
        push({
          periodEnd: current.periodEnd,
          metric: "gross_margin",
          type: "margin_swing",
          magnitude: swing,
          frequency,
        });
      }
    }

    const netMargin = ratioSeriesForFrequency(ratioSeries, "net_margin", frequency);
    for (const point of netMargin) {
      if (isBelowFloor(point.value, DEFAULT_THRESHOLDS.netMarginFloor)) {
        push({
          periodEnd: point.periodEnd,
          metric: "net_margin",
          type: "below_floor",
          magnitude: point.value ?? 0,
          frequency,
        });
      }
    }

    const revenue = metrics.series.RevenueFromContractWithCustomerExcludingAssessedTax;
    if (revenue?.status === "reported") {
      const revPoints = frequency === "annual" ? revenue.annual : revenue.quarterly;
      for (let i = 1; i < revPoints.length; i++) {
        const current = revPoints[i];
        const prior = revPoints[i - 1];
        if (prior.value === 0) continue;
        const growth = (current.value - prior.value) / prior.value;
        if (exceedsThreshold(growth, DEFAULT_THRESHOLDS.revenueYoYSwing)) {
          push({
            periodEnd: current.periodEnd,
            metric: "revenue",
            type: "revenue_swing",
            magnitude: growth,
            frequency,
          });
        }
      }
    }
  }

  return anomalies.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}
