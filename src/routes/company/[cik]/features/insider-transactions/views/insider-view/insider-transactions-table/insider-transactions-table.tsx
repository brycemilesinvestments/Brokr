"use client";

import { ColumnFilter } from "@/routes/company/[cik]/components/column-filter";
import { InsiderTransactionsChart } from "./insider-transactions-chart";
import { useInsiderTableFilters } from "./hooks/use-insider-table-filters";
import { COLUMNS } from "./lib/columns";
import type { InsiderTransactionsTableProps } from "./types";
import { formatShares } from "./utils/format-shares";

export function InsiderTransactionsTable({
  transactions,
  totalShown,
  secUrl,
}: InsiderTransactionsTableProps) {
  const {
    selectedByColumn,
    sortOrderByColumn,
    optionsByColumn,
    filteredTransactions,
    updateSelected,
    updateSortOrder,
    isFiltered,
  } = useInsiderTableFilters(transactions);

  return (
    <section
      id="insider-transactions"
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Insider transactions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {isFiltered
                ? `${filteredTransactions.length} of ${totalShown} insider transactions shown`
                : `${totalShown} insider transactions fetched sequentially across all pages`}
            </p>
          </div>
          <a
            href={secUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            View on SEC.gov
          </a>
        </div>
      </div>

      <InsiderTransactionsChart transactions={transactions} />

      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-6 py-3 align-bottom">
                  <ColumnFilter
                    label={column.label}
                    options={optionsByColumn[column.key]}
                    selected={selectedByColumn[column.key]}
                    onSelectedChange={(selected) => updateSelected(column.key, selected)}
                    sortOrder={sortOrderByColumn[column.key]}
                    onSortOrderChange={(sortOrder) => updateSortOrder(column.key, sortOrder)}
                    sortMode={column.sortMode}
                  />
                </th>
              ))}
              <th className="w-px whitespace-nowrap px-6 py-3">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTransactions.map((transaction, index) => (
              <tr
                key={`${transaction.accessionNumber ?? "na"}-${transaction.lineNumber ?? index}-${transaction.reportingOwner}-${transaction.transactionDate}`}
                className="hover:bg-zinc-50/80"
              >
                <td className="px-6 py-4 whitespace-nowrap text-zinc-600">
                  {transaction.transactionDate}
                </td>
                <td className="px-6 py-4 font-medium text-zinc-900">
                  {transaction.reportingOwner}
                </td>
                <td className="px-6 py-4 text-zinc-700">
                  {transaction.ownerType ?? "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-700">
                  {transaction.transactionType ?? "—"}
                </td>
                <td className="px-6 py-4 font-mono text-zinc-700">
                  {transaction.acquiredOrDisposed ?? "—"}
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-700">
                  {formatShares(transaction.sharesTransacted)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-700">
                  {formatShares(transaction.sharesOwnedFollowing)}
                </td>
                <td className="px-6 py-4 text-zinc-700">
                  {transaction.securityName ?? "—"}
                </td>
                <td className="w-px whitespace-nowrap px-6 py-4">
                  {transaction.formUrl ? (
                    <a
                      href={transaction.formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 whitespace-nowrap rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Form {transaction.form ?? "4"}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          {transactions.length === 0
            ? "No insider transactions found for this issuer."
            : "No insider transactions match the current filters."}
        </div>
      ) : null}
    </section>
  );
}
