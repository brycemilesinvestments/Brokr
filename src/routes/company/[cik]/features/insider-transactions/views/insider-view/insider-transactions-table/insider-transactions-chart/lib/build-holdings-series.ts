import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { OWNER_COLORS } from "../constants";
import type { LineSeries, SeriesPoint } from "../types";
import { parseTransactionDate } from "../utils/parse-transaction-date";

export function buildHoldingsSeries(
  transactions: InsiderTransaction[],
  owners: string[],
  securityName?: string,
): LineSeries[] {
  return owners.map((owner, index) => {
    const ownerTransactions = transactions
      .filter((transaction) => {
        if (transaction.reportingOwner !== owner) return false;
        if (securityName && transaction.securityName !== securityName) return false;
        return transaction.sharesOwnedFollowing !== undefined;
      })
      .sort(
        (a, b) =>
          parseTransactionDate(a.transactionDate) - parseTransactionDate(b.transactionDate) ||
          (a.lineNumber ?? 0) - (b.lineNumber ?? 0),
      );

    const points: SeriesPoint[] = ownerTransactions.map((transaction) => ({
      date: transaction.transactionDate,
      time: parseTransactionDate(transaction.transactionDate),
      value: transaction.sharesOwnedFollowing ?? 0,
    }));

    return {
      id: owner,
      label: owner,
      color: OWNER_COLORS[index % OWNER_COLORS.length],
      points,
    };
  });
}
