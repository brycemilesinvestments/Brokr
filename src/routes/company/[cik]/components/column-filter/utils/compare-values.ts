import type { SortMode } from "../types";

function parseDateValue(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function compareValues(a: string, b: string, sortMode: SortMode): number {
  if (sortMode === "date") {
    return parseDateValue(a) - parseDateValue(b);
  }
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}
