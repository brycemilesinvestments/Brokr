"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SortOrder } from "@/routes/company/[cik]/components/column-filter";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";
import {
  ANALYSIS_FILTER_OPTIONS,
  matchesAnalysisFilter,
} from "../lib/analysis-filter";
import { COLUMNS } from "../lib/columns";
import { FILINGS_TABLE_PAGE_SIZE } from "../lib/page-size";
import type { ColumnKey } from "../types";
import { compareFilings } from "../utils/compare-filings";
import { initialSelected, uniqueValues } from "../utils/table-filters";

type UseFilingsTableFiltersOptions = {
  getAnalysisStatus: (accessionNumber: string | undefined) => FilingWorkStatus;
};

function mergeNewColumnOptions(
  filings: Filing[],
  selectedByColumn: Record<ColumnKey, Set<string>>,
  previousOptionsByColumn: Record<ColumnKey, string[]>,
): Record<ColumnKey, Set<string>> | null {
  let changed = false;
  const next = { ...selectedByColumn };

  for (const column of COLUMNS) {
    const allValues = uniqueValues(filings, column.getValue);
    const previousOptions = new Set(previousOptionsByColumn[column.key]);
    const newValues = allValues.filter((value) => !previousOptions.has(value));

    if (newValues.length > 0) {
      next[column.key] = new Set([...selectedByColumn[column.key], ...newValues]);
      changed = true;
    }
  }

  return changed ? next : null;
}

export function useFilingsTableFilters(
  filings: Filing[],
  { getAnalysisStatus }: UseFilingsTableFiltersOptions,
) {
  const [pageState, setPageState] = useState({ signature: "", index: 0 });
  const [selectedByColumn, setSelectedByColumn] = useState<Record<ColumnKey, Set<string>>>(() =>
    Object.fromEntries(
      COLUMNS.map((column) => [column.key, initialSelected(filings, column.getValue)]),
    ) as Record<ColumnKey, Set<string>>,
  );
  const [selectedAnalysisStatus, setSelectedAnalysisStatus] = useState(
    () => new Set<string>(ANALYSIS_FILTER_OPTIONS),
  );

  const [sortOrderByColumn, setSortOrderByColumn] = useState<Record<ColumnKey, SortOrder>>(() =>
    Object.fromEntries(COLUMNS.map((column) => [column.key, "asc"])) as Record<
      ColumnKey,
      SortOrder
    >,
  );

  const [activeSortColumn, setActiveSortColumn] = useState<ColumnKey | null>(null);

  const optionsByColumn = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map((column) => [column.key, uniqueValues(filings, column.getValue)]),
      ) as Record<ColumnKey, string[]>,
    [filings],
  );

  const previousOptionsRef = useRef(optionsByColumn);

  useEffect(() => {
    const previousOptions = previousOptionsRef.current;
    previousOptionsRef.current = optionsByColumn;

    setSelectedByColumn((current) => {
      const merged = mergeNewColumnOptions(filings, current, previousOptions);
      return merged ?? current;
    });
  }, [filings, optionsByColumn]);

  const filteredFilings = useMemo(
    () =>
      filings.filter(
        (filing) =>
          COLUMNS.every((column) =>
            selectedByColumn[column.key].has(column.getValue(filing)),
          ) &&
          matchesAnalysisFilter(filing, selectedAnalysisStatus, getAnalysisStatus),
      ),
    [filings, selectedByColumn, selectedAnalysisStatus, getAnalysisStatus],
  );

  const sortedFilings = useMemo(() => {
    if (!activeSortColumn) return filteredFilings;

    const column = COLUMNS.find((entry) => entry.key === activeSortColumn);
    if (!column) return filteredFilings;

    const sortOrder = sortOrderByColumn[activeSortColumn];
    return filteredFilings.toSorted((a, b) => compareFilings(a, b, column, sortOrder));
  }, [filteredFilings, activeSortColumn, sortOrderByColumn]);

  const filterSignature = useMemo(
    () =>
      `${activeSortColumn ?? ""}:${JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedByColumn).map(([key, values]) => [
            key,
            [...values].toSorted().join("|"),
          ]),
        ),
      )}:${[...selectedAnalysisStatus].toSorted().join("|")}:${JSON.stringify(sortOrderByColumn)}`,
    [activeSortColumn, selectedByColumn, selectedAnalysisStatus, sortOrderByColumn],
  );

  const totalPages = Math.max(1, Math.ceil(sortedFilings.length / FILINGS_TABLE_PAGE_SIZE));
  const pageIndex =
    pageState.signature === filterSignature ? pageState.index : 0;
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  const paginatedFilings = useMemo(() => {
    const start = safePageIndex * FILINGS_TABLE_PAGE_SIZE;
    return sortedFilings.slice(start, start + FILINGS_TABLE_PAGE_SIZE);
  }, [sortedFilings, safePageIndex]);

  function updateSelected(columnKey: ColumnKey, selected: Set<string>) {
    setSelectedByColumn((current) => ({ ...current, [columnKey]: selected }));
  }

  function updateSortOrder(columnKey: ColumnKey, sortOrder: SortOrder) {
    setActiveSortColumn(columnKey);
    setSortOrderByColumn((current) => ({ ...current, [columnKey]: sortOrder }));
  }

  function filterToAnalysisStatuses(statuses: readonly string[]) {
    setSelectedAnalysisStatus(new Set(statuses));
  }

  function goToPage(index: number) {
    setPageState({ signature: filterSignature, index });
  }

  function goToPreviousPage() {
    goToPage(Math.max(0, safePageIndex - 1));
  }

  function goToNextPage() {
    goToPage(Math.min(totalPages - 1, safePageIndex + 1));
  }

  const isFiltered = filteredFilings.length !== filings.length;
  const pageStart = sortedFilings.length === 0 ? 0 : safePageIndex * FILINGS_TABLE_PAGE_SIZE + 1;
  const pageEnd = Math.min((safePageIndex + 1) * FILINGS_TABLE_PAGE_SIZE, sortedFilings.length);

  return {
    selectedByColumn,
    selectedAnalysisStatus,
    sortOrderByColumn,
    activeSortColumn,
    optionsByColumn,
    filteredFilings,
    displayedFilings: paginatedFilings,
    sortedFilingsCount: sortedFilings.length,
    pageIndex: safePageIndex,
    totalPages,
    pageStart,
    pageEnd,
    canGoPrevious: safePageIndex > 0,
    canGoNext: safePageIndex < totalPages - 1,
    goToPreviousPage,
    goToNextPage,
    updateSelected,
    updateAnalysisStatusSelected: setSelectedAnalysisStatus,
    filterToAnalysisStatuses,
    updateSortOrder,
    isFiltered,
  };
}
