"use client";

import { FilingsAnalysisProgress } from "@/components/bones/filings-analysis-progress";
import { ColumnFilter } from "@/routes/company/[cik]/components/column-filter";
import { FilingTableRow } from "./components/filing-table-row";
import { FilingsTablePagination } from "./components/filings-table-pagination";
import { useFilingsTableFilters } from "./hooks/use-filings-table-filters";
import { ANALYSIS_FILTER_OPTIONS } from "./lib/analysis-filter";
import { COLUMNS } from "./lib/columns";
import type { FilingsTableProps } from "./types";

export function FilingsTable({
  cik,
  filings,
  totalShown,
  hasMoreFilings = false,
  isLoadingMore = false,
  loadError = null,
  loadRemainingFilings,
  getAnalysisStatus,
  getAnalysisError,
  pipelineProgress,
}: FilingsTableProps) {
  const {
    selectedByColumn,
    selectedAnalysisStatus,
    sortOrderByColumn,
    activeSortColumn,
    optionsByColumn,
    filteredFilings,
    displayedFilings,
    sortedFilingsCount,
    pageIndex,
    totalPages,
    pageStart,
    pageEnd,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    updateSelected,
    updateAnalysisStatusSelected,
    filterToAnalysisStatuses,
    updateSortOrder,
    isFiltered,
  } = useFilingsTableFilters(filings, { getAnalysisStatus });

  const countLabel = isFiltered
    ? `${filteredFilings.length} of ${totalShown} SEC EDGAR submissions match filters`
    : isLoadingMore
      ? `Loading all SEC EDGAR submissions (${filings.length} loaded so far)…`
      : hasMoreFilings
        ? `${filings.length} of ${totalShown}+ SEC EDGAR submissions loaded`
        : `${totalShown} SEC EDGAR submissions fetched across all pages`;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-zinc-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">All filings</h2>
        <p className="mt-1 text-sm text-zinc-500">{countLabel}</p>
        {loadError ? (
          <p className="mt-1 text-sm text-red-600">{loadError}</p>
        ) : null}
        {pipelineProgress.active || pipelineProgress.error > 0 ? (
          <FilingsAnalysisProgress
            progress={pipelineProgress}
            onViewFailed={
              pipelineProgress.error > 0
                ? () => filterToAnalysisStatuses(["Failed"])
                : undefined
            }
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
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
                    secondaryFilter={
                      column.key === "description"
                        ? {
                            label: "Analysis status",
                            options: ANALYSIS_FILTER_OPTIONS,
                            selected: selectedAnalysisStatus,
                            onSelectedChange: updateAnalysisStatusSelected,
                          }
                        : undefined
                    }
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
                analysisLabelFormType={filing.type}
              />
            ))}
          </tbody>
        </table>
      </div>

      <FilingsTablePagination
        pageIndex={pageIndex}
        totalPages={totalPages}
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalCount={sortedFilingsCount}
        view={{
          showMoreTotal: hasMoreFilings,
          hasResults: sortedFilingsCount > 0,
        }}
        navigation={{
          canGoPrevious,
          canGoNext,
          hasMoreFilings,
          isLoadingMore,
        }}
        loadError={loadError}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
        onLoadRemainingFilings={loadRemainingFilings}
      />

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
