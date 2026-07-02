import type { CalendarKey, PeerExtraction, TargetPeriodPoint } from "@/lib/peers/types";
import type { ChartBundle, ChartPoint } from "@/lib/analysis";
import type { SeriesFrequency } from "@/lib/edgar/time-series";

/**
 * P3: Derive a calendar alignment key from a period end date.
 *
 * Alignment rule — uses the CALENDAR period, not fiscal year labels:
 *   Annual:    bucket = calendar year of periodEnd   → "2025"
 *   Quarterly: bucket = calendar year + quarter      → "2025-Q2"
 *
 * This ensures SNDK (June FY-end) and Micron (Aug FY-end) whose annual
 * periods both end in calendar year 2025 land in the same bucket,
 * regardless of whether their fp labels both say "FY".
 */
export function toCalendarKey(periodEnd: string, frequency: SeriesFrequency): CalendarKey {
  // Parse YYYY-MM-DD
  const year = Number(periodEnd.slice(0, 4));
  if (frequency === "annual") {
    return String(year);
  }
  const month = Number(periodEnd.slice(5, 7)); // 1-based
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

/** Infer frequency from a CalendarKey. */
export function frequencyFromKey(key: CalendarKey): SeriesFrequency {
  return key.includes("-Q") ? "quarterly" : "annual";
}

/**
 * Convert target chart points for a metric into calendar-aligned
 * TargetPeriodPoints, deduplicating by calendarKey (keeping the last
 * occurrence, which is the most recent filing).
 */
export function alignTargetSeries(
  metricKey: string,
  targetChart: ChartBundle,
): TargetPeriodPoint[] {
  const points = targetChart[metricKey];
  if (!points || points.length === 0) return [];

  const byKey = new Map<CalendarKey, TargetPeriodPoint>();

  for (const pt of points) {
    const key = toCalendarKey(pt.x, pt.frequency);
    byKey.set(key, {
      calendarKey: key,
      periodEnd: pt.x,
      value: pt.y,
      frequency: pt.frequency,
    });
  }

  return [...byKey.values()].toSorted((a, b) => a.calendarKey.localeCompare(b.calendarKey));
}

/** Peer chart points grouped by calendarKey for a given metric. */
export type PeerPointsByKey = Map<
  CalendarKey,
  Array<{ cik: string; entityName: string; value: number; periodEnd: string }>
>;

/**
 * Collect peer chart points for a metric, keyed by calendarKey.
 * If a peer has no data for a period, it is absent (P6: excluded, not zeroed).
 */
export function collectPeerPointsByKey(
  metricKey: string,
  peerExtractions: PeerExtraction[],
): PeerPointsByKey {
  const result: PeerPointsByKey = new Map();

  for (const peer of peerExtractions) {
    const points: ChartPoint[] = peer.chart[metricKey] ?? [];

    const seenKeys = new Set<CalendarKey>();
    for (const pt of points) {
      const key = toCalendarKey(pt.x, pt.frequency);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const existing = result.get(key) ?? [];
      existing.push({
        cik: peer.peerEntry.cik,
        entityName: peer.entityName,
        value: pt.y,
        periodEnd: pt.x,
      });
      result.set(key, existing);
    }
  }

  return result;
}
