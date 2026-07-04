"use client";

import { FilingsAnalysisProgress } from "@/components/bones/filings-analysis-progress";
import { ColumnFilter } from "@/routes/company/[cik]/components/column-filter";
import { FilingTableRow } from "./components/filing-table-row";
import { useFilingsTableFilters } from "./hooks/use-filings-table-filters";
import { COLUMNS } from "./lib/columns";
import type { FilingsTableProps } from "./types";

export function FilingsTable({
  cik,
  filings,
  totalShown,
  hasMoreFilings = false,
  getAnalysisStatus,
  getAnalysisError,
  analysisProgress,
}: FilingsTableProps) {
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

  const countLabel = isFiltered
    ? `${filteredFilings.length} of ${totalShown} SEC EDGAR submissions shown`
    : hasMoreFilings
      ? `${totalShown} recent SEC EDGAR submissions shown (older filings load on demand)`
      : `${totalShown} SEC EDGAR submissions fetched across all pages`;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">All filings</h2>
        <p className="mt-1 text-sm text-zinc-500">{countLabel}</p>
        {analysisProgress.active ? (
          <FilingsAnalysisProgress
            complete={analysisProgress.complete}
            loading={analysisProgress.loading}
            queued={analysisProgress.queued}
            error={analysisProgress.error}
            active={analysisProgress.active}
          />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full table-fixed divide-y divide-zinc-100 text-sm">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[36%]" />
            <col className="w-[12%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
          </colgroup>
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
            {displayedFilings.map((filing) => (
              <FilingTableRow
                key={`${filing.accessionNumber ?? filing.filingDate}-${filing.type}`}
                cik={cik}
                filing={filing}
                analysisStatus={getAnalysisStatus(filing.accessionNumber)}
                analysisError={getAnalysisError(filing.accessionNumber)}
              />
            ))}
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
