"use client";

import { ColumnFilter } from "@/routes/company/[cik]/components/column-filter";
import { COLUMNS } from "../lib/columns";
import { LEDGER_HEADER_COLUMNS } from "../lib/ledger-header-columns";
import type { ColumnKey } from "../types";
import { LEDGER_GRID_CLASS } from "../constants";
import type { SortOrder } from "@/routes/company/[cik]/components/column-filter";

type TransactionLedgerHeaderProps = {
  selectedByColumn: Record<ColumnKey, Set<string>>;
  sortOrderByColumn: Record<ColumnKey, SortOrder>;
  optionsByColumn: Record<ColumnKey, string[]>;
  updateSelected: (columnKey: ColumnKey, selected: Set<string>) => void;
  updateSortOrder: (columnKey: ColumnKey, sortOrder: SortOrder) => void;
};

export function TransactionLedgerHeader({
  selectedByColumn,
  sortOrderByColumn,
  optionsByColumn,
  updateSelected,
  updateSortOrder,
}: TransactionLedgerHeaderProps) {
  return (
    <div
      className={`${LEDGER_GRID_CLASS} border-b border-zinc-100 bg-zinc-50 px-[26px] py-[11px] font-mono text-[9.5px] font-semibold tracking-[0.07em] text-zinc-400 uppercase`}
    >
      {LEDGER_HEADER_COLUMNS.map((column) => (
        <div
          key={column.label}
          className={`min-w-0 space-y-1 ${column.align === "right" ? "text-right" : ""}`}
        >
          {column.filters.length > 0 ? (
            column.filters.map((filter) => {
              const config = COLUMNS.find((entry) => entry.key === filter.key);
              if (!config) return null;

              return (
                <div
                  key={filter.key}
                  className={column.align === "right" ? "flex justify-end" : ""}
                >
                  <ColumnFilter
                    label={filter.label}
                    options={optionsByColumn[filter.key]}
                    selected={selectedByColumn[filter.key]}
                    onSelectedChange={(selected) => updateSelected(filter.key, selected)}
                    sortOrder={sortOrderByColumn[filter.key]}
                    onSortOrderChange={(sortOrder) => updateSortOrder(filter.key, sortOrder)}
                    sortMode={config.sortMode}
                  />
                </div>
              );
            })
          ) : (
            <span>{column.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
