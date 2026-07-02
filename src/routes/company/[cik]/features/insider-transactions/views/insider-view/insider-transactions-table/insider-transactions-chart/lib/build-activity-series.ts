import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import type { LineSeries, TimeRange } from "../types";
import { bucketKey, bucketMidpoint, bucketSizeForRange } from "../utils/bucket-keys";

export function buildActivitySeries(
  transactions: InsiderTransaction[],
  range: TimeRange,
): LineSeries[] {
  const bucketSize = bucketSizeForRange(range);
  const buckets = new Map<string, { buys: number; sells: number }>();

  for (const transaction of transactions) {
    const shares = transaction.sharesTransacted ?? 0;
    if (!shares) continue;

    const key = bucketKey(transaction.transactionDate, bucketSize);
    const bucket = buckets.get(key) ?? { buys: 0, sells: 0 };

    if (transaction.acquiredOrDisposed === "A") {
      bucket.buys += shares;
    } else if (transaction.acquiredOrDisposed === "D") {
      bucket.sells += shares;
    }

    buckets.set(key, bucket);
  }

  const sortedKeys = [...buckets.keys()].sort();
  const bucketPoints = sortedKeys.map((key) => ({
    key,
    ...bucketMidpoint(key, bucketSize),
  }));

  return [
    {
      id: "buys",
      label: "Shares acquired",
      color: "#047857",
      points: bucketPoints.map(({ date, time, key }) => ({
        date,
        time,
        value: buckets.get(key)?.buys ?? 0,
      })),
    },
    {
      id: "sells",
      label: "Shares disposed",
      color: "#dc2626",
      points: bucketPoints.map(({ date, time, key }) => ({
        date,
        time,
        value: buckets.get(key)?.sells ?? 0,
      })),
    },
  ];
}
