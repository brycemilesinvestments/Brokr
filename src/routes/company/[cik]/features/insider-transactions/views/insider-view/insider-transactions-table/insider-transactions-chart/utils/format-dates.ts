import type { TimeRange } from "../types";
import { parseTransactionDate } from "./parse-transaction-date";

export function formatAxisDateForRange(value: string, range: TimeRange): string {
  const time = parseTransactionDate(value);
  if (!time) return value;

  const date = new Date(time);
  if (range === "1D" || range === "1W") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (range === "1M" || range === "3M") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatTableDate(value: string): string {
  const time = parseTransactionDate(value);
  if (!time) return value;
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
