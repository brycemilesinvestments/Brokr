"use client";

import { InsiderTransactionsChart } from "./insider-transactions-chart";
import { TransactionLedger } from "./components/transaction-ledger";
import type { InsiderTransactionsTableProps } from "./types";

export function InsiderTransactionsTable({
  transactions,
  secUrl,
  ticker,
}: InsiderTransactionsTableProps) {
  return (
    <section
      id="insider-transactions"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white"
    >
      <InsiderTransactionsChart transactions={transactions} ticker={ticker} />

      <TransactionLedger transactions={transactions} ticker={ticker} secUrl={secUrl} />
    </section>
  );
}
