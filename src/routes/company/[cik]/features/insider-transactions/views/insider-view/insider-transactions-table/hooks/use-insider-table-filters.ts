"use client";

import { useMemo, useState } from "react";
import type { SortOrder } from "@/routes/company/[cik]/components/column-filter";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { COLUMNS } from "../lib/columns";
import type { ColumnKey } from "../types";
import { initialSelected, uniqueValues } from "../utils/table-filters";

export function useInsiderTableFilters(transactions: InsiderTransaction[]) {
  const [selectedByColumn, setSelectedByColumn] = useState<Record<ColumnKey, Set<string>>>(() =>
    Object.fromEntries(
      COLUMNS.map((column) => [column.key, initialSelected(transactions, column.getValue)]),
    ) as Record<ColumnKey, Set<string>>,
  );

  const [sortOrderByColumn, setSortOrderByColumn] = useState<Record<ColumnKey, SortOrder>>(() =>
    Object.fromEntries(
      COLUMNS.map((column) => [
        column.key,
        column.key === "transactionDate" ? "desc" : "asc",
      ]),
    ) as Record<ColumnKey, SortOrder>,
  );

  const optionsByColumn = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map((column) => [column.key, uniqueValues(transactions, column.getValue)]),
      ) as Record<ColumnKey, string[]>,
    [transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        COLUMNS.every((column) =>
          selectedByColumn[column.key].has(column.getValue(transaction)),
        ),
      ),
    [transactions, selectedByColumn],
  );

  function updateSelected(columnKey: ColumnKey, selected: Set<string>) {
    setSelectedByColumn((current) => ({ ...current, [columnKey]: selected }));
  }

  function updateSortOrder(columnKey: ColumnKey, sortOrder: SortOrder) {
    setSortOrderByColumn((current) => ({ ...current, [columnKey]: sortOrder }));
  }

  const isFiltered = filteredTransactions.length !== transactions.length;

  return {
    selectedByColumn,
    sortOrderByColumn,
    optionsByColumn,
    filteredTransactions,
    updateSelected,
    updateSortOrder,
    isFiltered,
  };
}
