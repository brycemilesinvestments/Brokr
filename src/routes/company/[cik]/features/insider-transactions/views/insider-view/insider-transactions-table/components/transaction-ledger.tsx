"use client";

import { useMemo } from "react";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { LEDGER_AD_FILTERS } from "../constants";
import { useInsiderTableFilters } from "../hooks/use-insider-table-filters";
import { useTransactionLedger } from "../hooks/use-transaction-ledger";
import { maxShareVolume } from "../lib/compute-share-bar-width";
import { TransactionLedgerHeader } from "./transaction-ledger-header";
import { TransactionLedgerRow } from "./transaction-ledger-row";

type TransactionLedgerProps = {
  transactions: InsiderTransaction[];
  ticker?: string;
  secUrl: string;
};

export function TransactionLedger({ transactions, ticker, secUrl }: TransactionLedgerProps) {
  const {
    selectedByColumn,
    sortOrderByColumn,
    optionsByColumn,
    filteredTransactions: columnFilteredTransactions,
    updateSelected,
    updateSortOrder,
    isFiltered: isColumnFiltered,
  } = useInsiderTableFilters(transactions);

  const { adFilter, setAdFilter, filteredTransactions } = useTransactionLedger(
    transactions,
    columnFilteredTransactions,
  );

  const shareVolumeMax = maxShareVolume(filteredTransactions);

  const isFiltered = useMemo(
    () => isColumnFiltered || adFilter !== "all",
    [isColumnFiltered, adFilter],
  );

  return (
    <div className="border-t border-zinc-100">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-100 px-[26px] pt-[22px] pb-4">
        <div>
          <div className="font-mono text-[10.5px] font-semibold tracking-[0.09em] text-emerald-600 uppercase">
            Insider transactions · Form 4
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <h3 className="text-[17px] font-semibold text-zinc-900">Transaction ledger</h3>
            {ticker ? (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-600">
                {ticker}
              </span>
            ) : null}
          </div>
          {isFiltered ? (
            <p className="mt-1 text-xs text-zinc-500">
              {filteredTransactions.length} of {transactions.length} transactions shown
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {LEDGER_AD_FILTERS.map((filter) => {
            const isActive = adFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setAdFilter(filter.value)}
                className={`rounded-lg px-3 py-1 text-[11.5px] font-semibold transition ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
          <a
            href={secUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 rounded-lg border border-zinc-200 px-3 py-1 text-[11.5px] font-semibold text-zinc-600 transition hover:bg-zinc-50"
          >
            SEC.gov
          </a>
        </div>
      </div>

      <TransactionLedgerHeader
        selectedByColumn={selectedByColumn}
        sortOrderByColumn={sortOrderByColumn}
        optionsByColumn={optionsByColumn}
        updateSelected={updateSelected}
        updateSortOrder={updateSortOrder}
      />

      {filteredTransactions.length > 0 ? (
        <div className="max-h-[min(520px,55vh)] overflow-y-auto">
          {filteredTransactions.map((transaction, index) => (
            <TransactionLedgerRow
              key={`${transaction.accessionNumber ?? "na"}-${transaction.lineNumber ?? index}-${transaction.reportingOwner}-${transaction.transactionDate}`}
              transaction={transaction}
              maxShareVolume={shareVolumeMax}
            />
          ))}
        </div>
      ) : (
        <div className="px-[26px] py-10 text-center text-sm text-zinc-500">
          {transactions.length === 0
            ? "No insider transactions found for this issuer."
            : "No transactions match the current filters."}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 bg-zinc-50 px-[26px] py-3.5 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Acquired (A)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" />
          Disposed (D)
        </span>
        <span className="ml-auto font-mono">bar = log-scaled share volume</span>
      </div>
    </div>
  );
}
