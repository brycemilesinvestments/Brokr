import type { SortOrder } from "@/routes/company/[cik]/components/column-filter";
import type { Filing } from "@/routes/company/[cik]/types";
import type { ColumnConfig } from "../types";

function parseDateValue(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareFilings(
  a: Filing,
  b: Filing,
  column: ColumnConfig,
  sortOrder: SortOrder,
): number {
  const aValue = column.getValue(a);
  const bValue = column.getValue(b);
  let result: number;

  if (column.sortMode === "date") {
    result = parseDateValue(aValue) - parseDateValue(bValue);
  } else {
    result = aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
  }

  return sortOrder === "desc" ? -result : result;
}
