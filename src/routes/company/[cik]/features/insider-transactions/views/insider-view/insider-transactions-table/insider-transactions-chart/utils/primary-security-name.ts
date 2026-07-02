import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

export function primarySecurityName(transactions: InsiderTransaction[]): string | undefined {
  const counts = new Map<string, number>();
  for (const transaction of transactions) {
    const name = transaction.securityName?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
