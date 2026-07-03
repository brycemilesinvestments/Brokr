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
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <InsiderTransactionsChart transactions={transactions} ticker={ticker} />

      <TransactionLedger transactions={transactions} ticker={ticker} secUrl={secUrl} />
    </section>
  );
}
