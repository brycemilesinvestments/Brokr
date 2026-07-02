import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

export function uniqueValues(
  transactions: InsiderTransaction[],
  getValue: (transaction: InsiderTransaction) => string,
): string[] {
  return [...new Set(transactions.map(getValue))];
}

export function initialSelected(
  transactions: InsiderTransaction[],
  getValue: (transaction: InsiderTransaction) => string,
): Set<string> {
  return new Set(uniqueValues(transactions, getValue));
}
