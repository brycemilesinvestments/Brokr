"use client";

import { Popover } from "@base-ui/react/popover";
import { useMemo } from "react";
import { FilterIcon } from "./components/filter-icon";
import { SortButton } from "./components/sort-button";
import type { ColumnFilterProps } from "./types";
import { compareValues } from "./utils/compare-values";

export function ColumnFilter({
  label,
  options,
  selected,
  onSelectedChange,
  sortOrder,
  onSortOrderChange,
  sortMode = "text",
  isActiveSort = false,
}: ColumnFilterProps) {
  const filterOptions = useMemo(() => {
    const copy = [...options];
    copy.sort((a, b) => compareValues(a, b, sortMode));
    return copy;
  }, [options, sortMode]);

  const sortLabels =
    sortMode === "date"
      ? { asc: "Oldest first", desc: "Newest first" }
      : { asc: "A → Z", desc: "Z → A" };

  const allSelected = options.length > 0 && options.every((option) => selected.has(option));
  const isFiltered = !allSelected;

  function toggleOption(option: string) {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onSelectedChange(next);
  }

  function toggleSelectAll() {
    if (allSelected) {
      onSelectedChange(new Set());
    } else {
      onSelectedChange(new Set(options));
    }
  }

  return (
    <Popover.Root>
      <div className="inline-flex items-center gap-1.5">
        <span>
          {label}
          {isActiveSort ? (
            <span className="ml-1 text-emerald-600" aria-hidden="true">
              {sortOrder === "asc" ? "↑" : "↓"}
            </span>
          ) : null}
        </span>
        <Popover.Trigger
          aria-label={`Filter ${label}`}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal transition ${
            isFiltered
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
          }`}
        >
          <FilterIcon />
          {isFiltered ? <span>{selected.size}</span> : null}
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup
            initialFocus={false}
            className="w-64 rounded-xl border border-zinc-200 bg-white shadow-lg outline-none"
          >
            <div className="border-b border-zinc-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Sort</p>
              <div className="mt-1.5 flex gap-1">
                <SortButton
                  active={sortOrder === "asc"}
                  onClick={() => onSortOrderChange("asc")}
                >
                  {sortLabels.asc}
                </SortButton>
                <SortButton
                  active={sortOrder === "desc"}
                  onClick={() => onSortOrderChange("desc")}
                >
                  {sortLabels.desc}
                </SortButton>
              </div>
            </div>

            <div className="border-b border-zinc-100 px-3 py-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-emerald-700 transition hover:text-emerald-800"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            <ul
              role="listbox"
              aria-multiselectable="true"
              aria-label={`${label} filter options`}
              className="max-h-56 overflow-y-auto py-1"
            >
              {filterOptions.map((option) => {
                const checked = selected.has(option);
                return (
                  <li key={option} role="option" aria-selected={checked}>
                    <label className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option)}
                        className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                      />
                      <span className="min-w-0 break-words">{option}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
