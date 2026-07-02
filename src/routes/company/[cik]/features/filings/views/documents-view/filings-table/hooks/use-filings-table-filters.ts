"use client";

import { useMemo, useState } from "react";
import type { SortOrder } from "@/routes/company/[cik]/components/column-filter";
import type { Filing } from "@/routes/company/[cik]/types";
import { COLUMNS } from "../lib/columns";
import type { ColumnKey } from "../types";
import { compareFilings } from "../utils/compare-filings";
import { initialSelected, uniqueValues } from "../utils/table-filters";

export function useFilingsTableFilters(filings: Filing[]) {
  const [selectedByColumn, setSelectedByColumn] = useState<Record<ColumnKey, Set<string>>>(() =>
    Object.fromEntries(
      COLUMNS.map((column) => [column.key, initialSelected(filings, column.getValue)]),
    ) as Record<ColumnKey, Set<string>>,
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

  const filteredFilings = useMemo(
    () =>
      filings.filter((filing) =>
        COLUMNS.every((column) => selectedByColumn[column.key].has(column.getValue(filing))),
      ),
    [filings, selectedByColumn],
  );

  const displayedFilings = useMemo(() => {
    if (!activeSortColumn) return filteredFilings;

    const column = COLUMNS.find((entry) => entry.key === activeSortColumn);
    if (!column) return filteredFilings;

    const sortOrder = sortOrderByColumn[activeSortColumn];
    return filteredFilings.toSorted((a, b) => compareFilings(a, b, column, sortOrder));
  }, [filteredFilings, activeSortColumn, sortOrderByColumn]);

  function updateSelected(columnKey: ColumnKey, selected: Set<string>) {
    setSelectedByColumn((current) => ({ ...current, [columnKey]: selected }));
  }

  function updateSortOrder(columnKey: ColumnKey, sortOrder: SortOrder) {
    setActiveSortColumn(columnKey);
    setSortOrderByColumn((current) => ({ ...current, [columnKey]: sortOrder }));
  }

  const isFiltered = filteredFilings.length !== filings.length;

  return {
    selectedByColumn,
    sortOrderByColumn,
    activeSortColumn,
    optionsByColumn,
    filteredFilings,
    displayedFilings,
    updateSelected,
    updateSortOrder,
    isFiltered,
  };
}
