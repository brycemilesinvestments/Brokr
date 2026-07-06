import type { BucketSize } from "../types";
import { parseTransactionDate } from "./parse-transaction-date";

function dayKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  return new Date(time).toISOString().slice(0, 10);
}

function weekKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  const d = new Date(time);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function monthKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketKey(date: string, bucketSize: BucketSize): string {
  if (bucketSize === "day") return dayKey(date);
  if (bucketSize === "week") return weekKey(date);
  return monthKey(date);
}
