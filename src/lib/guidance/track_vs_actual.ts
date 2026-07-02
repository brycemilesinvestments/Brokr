import { latest_actual_by_metric } from "@/lib/guidance/extract_guidance";
import type { GuidanceExtraction, GuidanceVsActual, TaggedNumber } from "@/lib/guidance/types";

function midpoint(low?: number, high?: number): number | undefined {
  if (low === undefined || high === undefined) return undefined;
  return (low + high) / 2;
}

/**
 * G6 — Compare extracted guidance ranges against latest tagged actuals.
 */
export function track_vs_actual(
  guidance: GuidanceExtraction,
  taggedNumbers: TaggedNumber[],
): GuidanceVsActual[] {
  const latestByMetric = latest_actual_by_metric(taggedNumbers);
  const rows: GuidanceVsActual[] = [];

  for (const range of guidance.ranges) {
    const actual = latestByMetric.get(range.metric);
    const actualValue = actual?.value;
    const hasAnyBound = range.low !== undefined || range.high !== undefined;

    let inRange: boolean | null = null;
    if (actualValue !== undefined && hasAnyBound) {
      const lowPass = range.low === undefined || actualValue >= range.low;
      const highPass = range.high === undefined || actualValue <= range.high;
      inRange = lowPass && highPass;
    }

    const mid = midpoint(range.low, range.high);
    rows.push({
      metric: range.metric,
      guidanceLow: range.low,
      guidanceHigh: range.high,
      actual: actualValue,
      unit: range.unit ?? actual?.unit,
      inRange,
      varianceToMidpoint:
        actualValue !== undefined && mid !== undefined ? actualValue - mid : undefined,
    });
  }

  return rows.sort((a, b) => a.metric.localeCompare(b.metric));
}
