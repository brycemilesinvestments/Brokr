import type {
  MetricPoint,
  ThresholdAlert,
  ThresholdTrigger,
  WatchlistEntry,
} from "@/lib/watchlist/types";

/** Deterministic dedup key scoped to one period-end crossing. */
function thresholdEventKey(
  cik: string,
  metric: string,
  operator: string,
  threshold: number,
  periodEnd: string,
): string {
  return `threshold:${cik}:${metric}:${operator}:${threshold}:${periodEnd}`;
}

type EvalResult = {
  fires: boolean;
  value: number;
  periodEnd: string;
} | null;

/**
 * Evaluate a single threshold trigger against a time-ordered metric series.
 * Deterministic: returns the same result for the same series.
 *
 * "drop" operator: fires when (second-to-last − latest) >= trigger.value.
 */
function evaluateTrigger(
  trigger: ThresholdTrigger,
  series: MetricPoint[],
): EvalResult {
  if (series.length === 0) return null;

  const sorted = [...series].sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd),
  );
  const latest = sorted[sorted.length - 1];

  if (trigger.operator === "lt") {
    return latest.value < trigger.value
      ? { fires: true, value: latest.value, periodEnd: latest.periodEnd }
      : null;
  }

  if (trigger.operator === "gt") {
    return latest.value > trigger.value
      ? { fires: true, value: latest.value, periodEnd: latest.periodEnd }
      : null;
  }

  // "drop": requires at least two points
  if (trigger.operator === "drop") {
    if (sorted.length < 2) return null;
    const prior = sorted[sorted.length - 2];
    const drop = prior.value - latest.value;
    return drop >= trigger.value
      ? { fires: true, value: latest.value, periodEnd: latest.periodEnd }
      : null;
  }

  return null;
}

/**
 * W3 — Evaluate all threshold triggers for one watchlist entry.
 *
 * metricSeries keys must match ThresholdMetric values
 * (e.g. "net_margin", "fcf", "health_score"). Callers are responsible
 * for mapping domain bundles to MetricPoint[] before calling this.
 *
 * Deterministic: same series → same alerts.
 */
export function evalThresholds(
  entry: WatchlistEntry,
  metricSeries: Record<string, MetricPoint[]>,
): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = [];

  for (const trigger of entry.triggerConfig.triggers) {
    if (trigger.kind !== "threshold") continue;

    const series = metricSeries[trigger.metric] ?? [];
    const result = evaluateTrigger(trigger, series);
    if (!result) continue;

    alerts.push({
      type: "threshold_crossed",
      cik: entry.cik,
      metric: trigger.metric,
      value: result.value,
      threshold: trigger.value,
      operator: trigger.operator,
      periodEnd: result.periodEnd,
      eventKey: thresholdEventKey(
        entry.cik,
        trigger.metric,
        trigger.operator,
        trigger.value,
        result.periodEnd,
      ),
    });
  }

  return alerts;
}
