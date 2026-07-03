import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { bucketKey } from "../utils/bucket-keys";
import { formatMonthAxisLabel } from "../utils/format-month-label";

export type MonthlyVolumeBucket = {
  monthKey: string;
  label: string;
  acquired: number;
  disposed: number;
};

export function buildMonthlyVolume(
  transactions: InsiderTransaction[],
): MonthlyVolumeBucket[] {
  const buckets = new Map<string, { acquired: number; disposed: number }>();

  for (const transaction of transactions) {
    const shares = transaction.sharesTransacted ?? 0;
    if (!shares) continue;

    const monthKey = bucketKey(transaction.transactionDate, "month");
    const bucket = buckets.get(monthKey) ?? { acquired: 0, disposed: 0 };

    if (transaction.acquiredOrDisposed === "A") {
      bucket.acquired += shares;
    } else if (transaction.acquiredOrDisposed === "D") {
      bucket.disposed += shares;
    }

    buckets.set(monthKey, bucket);
  }

  const sortedKeys = [...buckets.keys()].toSorted();
  return sortedKeys.map((monthKey, index) => {
    const bucket = buckets.get(monthKey) ?? { acquired: 0, disposed: 0 };
    const previousKey = index > 0 ? sortedKeys[index - 1] : undefined;
    return {
      monthKey,
      label: formatMonthAxisLabel(monthKey, previousKey),
      acquired: bucket.acquired,
      disposed: bucket.disposed,
    };
  });
}
