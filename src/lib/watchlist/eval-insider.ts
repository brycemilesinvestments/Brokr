import type {
  InsiderPurchaseAlert,
  InsiderPurchaseTrigger,
  InsiderTransactionInput,
  WatchlistEntry,
} from "@/lib/watchlist/types";

/** Deterministic dedup key for an insider purchase event. */
function insiderPurchaseEventKey(
  cik: string,
  reportingOwner: string,
  transactionDate: string,
  accessionNumber?: string,
): string {
  const base = `insider_purchase:${cik}:${reportingOwner}:${transactionDate}`;
  return accessionNumber ? `${base}:${accessionNumber}` : base;
}

/**
 * Parse the leading letter from a transaction type string (e.g. "P-Purchase" → "P").
 * Returns null when the type is missing or unparseable.
 */
function parseTransactionCode(transactionType?: string): string | null {
  if (!transactionType) return null;
  const match = transactionType.trim().match(/^([A-Za-z])/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * W4 — Evaluate insider purchase triggers for one watchlist entry.
 *
 * Only open-market purchases (code "P", acquiredOrDisposed "A") fire.
 * F-InKind (code "F") and all other codes are explicitly excluded.
 */
export function evalInsider(
  entry: WatchlistEntry,
  transactions: InsiderTransactionInput[],
): InsiderPurchaseAlert[] {
  const trigger = entry.triggerConfig.triggers.find(
    (t): t is InsiderPurchaseTrigger => t.kind === "insider_purchase",
  );
  if (!trigger) return [];

  const alerts: InsiderPurchaseAlert[] = [];

  for (const txn of transactions) {
    const code = parseTransactionCode(txn.transactionType);

    // W4: only code P (open-market purchase). F-InKind must NOT fire.
    if (code !== "P") continue;

    // Purchases must be acquisitions (A), not disposals (D).
    if (txn.acquiredOrDisposed !== "A") continue;

    // Optional minimum share filter.
    if (trigger.minShares !== undefined) {
      const shares = txn.sharesTransacted ?? 0;
      if (shares < trigger.minShares) continue;
    }

    alerts.push({
      type: "insider_purchase",
      cik: entry.cik,
      reportingOwner: txn.reportingOwner,
      transactionDate: txn.transactionDate,
      accessionNumber: txn.accessionNumber,
      sharesTransacted: txn.sharesTransacted,
      eventKey: insiderPurchaseEventKey(
        entry.cik,
        txn.reportingOwner,
        txn.transactionDate,
        txn.accessionNumber,
      ),
    });
  }

  return alerts;
}
