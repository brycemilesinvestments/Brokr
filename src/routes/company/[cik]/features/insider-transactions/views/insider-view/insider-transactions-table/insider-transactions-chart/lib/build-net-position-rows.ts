import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import type { NetPositionRow } from "../types";
import { parseTransactionDate } from "../utils/parse-transaction-date";

export function buildNetPositionRows(transactions: InsiderTransaction[]): NetPositionRow[] {
  const byOwner = new Map<
    string,
    { netShares: number; ownerType?: string; transactions: InsiderTransaction[] }
  >();

  for (const transaction of transactions) {
    const shares = transaction.sharesTransacted ?? 0;
    if (!shares) continue;

    const entry = byOwner.get(transaction.reportingOwner) ?? {
      netShares: 0,
      transactions: [],
    };

    if (transaction.acquiredOrDisposed === "A") {
      entry.netShares += shares;
    } else if (transaction.acquiredOrDisposed === "D") {
      entry.netShares -= shares;
    }

    if (transaction.ownerType) {
      entry.ownerType = transaction.ownerType;
    }

    entry.transactions.push(transaction);
    byOwner.set(transaction.reportingOwner, entry);
  }

  const rows: NetPositionRow[] = [];

  for (const [owner, entry] of byOwner.entries()) {
    if (entry.netShares === 0) continue;

    rows.push({
      owner,
      ownerType: entry.ownerType,
      netShares: entry.netShares,
      transactions: entry.transactions.toSorted(
        (a, b) =>
          parseTransactionDate(b.transactionDate) - parseTransactionDate(a.transactionDate) ||
          (b.lineNumber ?? 0) - (a.lineNumber ?? 0),
      ),
    });
  }

  return rows.toSorted((a, b) => Math.abs(b.netShares) - Math.abs(a.netShares));
}
