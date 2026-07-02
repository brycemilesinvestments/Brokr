import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { TIME_RANGE_OPTIONS } from "../constants";
import type { TimeRange } from "../types";
import { parseTransactionDate } from "../utils/parse-transaction-date";

function latestTransactionTime(transactions: InsiderTransaction[]): number {
  let latest = 0;
  for (const transaction of transactions) {
    const time = parseTransactionDate(transaction.transactionDate);
    if (time > 0 && time > latest) latest = time;
  }
  return latest > 0 ? latest : Date.now();
}

export function filterByTimeRange(
  transactions: InsiderTransaction[],
  range: TimeRange,
  latestTime = latestTransactionTime(transactions),
): InsiderTransaction[] {
  const option = TIME_RANGE_OPTIONS.find((entry) => entry.value === range);
  if (!option?.ms) return transactions;

  const cutoff = latestTime - option.ms;
  return transactions.filter(
    (transaction) => parseTransactionDate(transaction.transactionDate) >= cutoff,
  );
}

export { latestTransactionTime };
