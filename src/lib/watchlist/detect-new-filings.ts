import type { FilingInput, NewFilingAlert, NewFilingTrigger, WatchlistEntry } from "@/lib/watchlist/types";

/** Deterministic dedup key — stable across polls for the same filing. */
function newFilingEventKey(cik: string, accessionNumber: string): string {
  return `new_filing:${cik}:${accessionNumber}`;
}

/**
 * W2 — Detect filings that have not yet been seen for a watchlist entry.
 *
 * Idempotent: a filing whose accessionNumber already appears in seenAccessions
 * will never produce an alert, regardless of how many times this is called.
 */
export function detectNewFilings(
  entry: WatchlistEntry,
  filings: FilingInput[],
  seenAccessions: ReadonlySet<string>,
): NewFilingAlert[] {
  const trigger = entry.triggerConfig.triggers.find(
    (t): t is NewFilingTrigger => t.kind === "new_filing",
  );
  if (!trigger) return [];

  const hasFormFilter =
    trigger.formTypes !== undefined && trigger.formTypes.length > 0;

  const alerts: NewFilingAlert[] = [];

  for (const filing of filings) {
    if (seenAccessions.has(filing.accessionNumber)) continue;

    if (hasFormFilter && !trigger.formTypes!.includes(filing.form)) {
      continue;
    }

    alerts.push({
      type: "new_filing",
      cik: entry.cik,
      accessionNumber: filing.accessionNumber,
      form: filing.form,
      filingDate: filing.filingDate,
      eventKey: newFilingEventKey(entry.cik, filing.accessionNumber),
    });
  }

  return alerts;
}
