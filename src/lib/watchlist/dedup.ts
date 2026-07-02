import type { StructuredAlert } from "@/lib/watchlist/types";

/**
 * W5 — Filter candidate alerts to only those not previously fired.
 *
 * Deterministic: given the same candidates and firedEventKeys, always returns
 * the same set of new alerts. Within a single poll, duplicate event keys are
 * also collapsed (only the first occurrence is kept).
 *
 * Returns the new alerts and the event keys that should now be persisted.
 */
export function dedup(
  candidates: StructuredAlert[],
  firedEventKeys: ReadonlySet<string>,
): { newAlerts: StructuredAlert[]; newFiredKeys: string[] } {
  const seenThisRun = new Set<string>();
  const newAlerts: StructuredAlert[] = [];
  const newFiredKeys: string[] = [];

  for (const alert of candidates) {
    if (firedEventKeys.has(alert.eventKey)) continue;
    if (seenThisRun.has(alert.eventKey)) continue;

    seenThisRun.add(alert.eventKey);
    newAlerts.push(alert);
    newFiredKeys.push(alert.eventKey);
  }

  return { newAlerts, newFiredKeys };
}
