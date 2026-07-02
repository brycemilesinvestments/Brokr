"use client";

import Link from "next/link";
import { ColumnFilter } from "@/routes/company/[cik]/components/column-filter";
import { resolveFilingPagePath } from "@/lib/edgar/constants";
import { useFilingsTableFilters } from "./hooks/use-filings-table-filters";
import { COLUMNS } from "./lib/columns";
import type { FilingsTableProps } from "./types";

export function FilingsTable({ cik, filings, totalShown }: FilingsTableProps) {
  const {
    selectedByColumn,
    sortOrderByColumn,
    activeSortColumn,
    optionsByColumn,
    filteredFilings,
    displayedFilings,
    updateSelected,
    updateSortOrder,
    isFiltered,
  } = useFilingsTableFilters(filings);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">All filings</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {isFiltered
            ? `${filteredFilings.length} of ${totalShown} SEC EDGAR submissions shown`
            : `${totalShown} SEC EDGAR submissions fetched across all pages`}
        </p>
      </div>

      <div className="overflow-x-auto">
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
                    isActiveSort={activeSortColumn === column.key}
                  />
                </th>
              ))}
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayedFilings.map((filing) => {
              const filingPageHref = resolveFilingPagePath(cik, filing);

              return (
              <tr
                key={`${filing.accessionNumber ?? filing.filingDate}-${filing.type}`}
                className="hover:bg-zinc-50/80"
              >
                <td className="px-6 py-4 font-mono font-medium text-zinc-900">{filing.type}</td>
                <td className="px-6 py-4 text-zinc-700">{filing.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-zinc-600">{filing.filingDate}</td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                  {filing.accessionNumber ?? "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {filing.documentsUrl ? (
                      <a
                        href={filing.documentsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Documents
                      </a>
                    ) : null}
                    {filingPageHref ? (
                      <Link
                        href={filingPageHref}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                      >
                        Filing
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {displayedFilings.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          {filings.length === 0
            ? "No filings found for this company."
            : "No filings match the current filters."}
        </div>
      ) : null}
    </section>
  );
}
