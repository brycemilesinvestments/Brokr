import type { FilingRef, InsiderTransaction } from "@/lib/edgar";
import type { EventStudyTransaction } from "@/lib/insider/aggregate";

export function buildFilingDateLookup(filings: FilingRef[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const filing of filings) {
    lookup.set(filing.accessionNumber, filing.filingDate);
  }
  return lookup;
}

export function resolveInsiderFilingDate(
  transaction: InsiderTransaction,
  filingDateByAccession: Map<string, string>,
): string | undefined {
  if (transaction.accessionNumber) {
    const fromAccession = filingDateByAccession.get(transaction.accessionNumber);
    if (fromAccession) return fromAccession;
  }

  const deemed = transaction.deemedExecutionDate?.trim();
  if (deemed) return deemed;

  const txnDate = transaction.transactionDate?.trim();
  return txnDate || undefined;
}

export function toEventStudyTransactions(
  transactions: InsiderTransaction[],
  filingDateByAccession: Map<string, string>,
): EventStudyTransaction[] {
  const results: EventStudyTransaction[] = [];

  for (const transaction of transactions) {
    const filingDate = resolveInsiderFilingDate(transaction, filingDateByAccession);
    if (!filingDate) continue;
    results.push({ transaction, filingDate });
  }

  return results;
}
