import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

export function uniqueOwners(transactions: InsiderTransaction[]): string[] {
  return [...new Set(transactions.map((t) => t.reportingOwner))].toSorted((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
