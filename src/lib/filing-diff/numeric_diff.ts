import type {
  NumericDiffItem,
  NumericDiffResult,
  NumericMetricMap,
} from "@/lib/filing-diff/types";

function toDefinedNumber(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
}

/** F2 — Deterministic numeric deltas from metric snapshots (free layer only). */
export function computeNumericDiff(
  current: NumericMetricMap,
  previous: NumericMetricMap,
): NumericDiffResult {
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)])).sort();
  const items: NumericDiffItem[] = keys.map((metric) => {
    const currentValue = toDefinedNumber(current[metric]);
    const previousValue = toDefinedNumber(previous[metric]);
    if (currentValue === undefined || previousValue === undefined) {
      return {
        metric,
        current: currentValue,
        previous: previousValue,
        changed: currentValue !== previousValue,
      };
    }

    const delta = currentValue - previousValue;
    const deltaPct = previousValue === 0 ? undefined : delta / Math.abs(previousValue);
    return {
      metric,
      current: currentValue,
      previous: previousValue,
      delta,
      deltaPct,
      changed: Math.abs(delta) > 0,
    };
  });

  return {
    items,
    changedCount: items.filter((i) => i.changed).length,
  };
}
