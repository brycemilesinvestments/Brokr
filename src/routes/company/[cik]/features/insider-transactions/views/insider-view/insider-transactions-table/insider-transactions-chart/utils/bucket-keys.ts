import type { BucketSize, TimeRange } from "../types";
import { parseTransactionDate } from "./parse-transaction-date";

export function dayKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  return new Date(time).toISOString().slice(0, 10);
}

export function weekKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  const d = new Date(time);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function monthKey(date: string): string {
  const time = parseTransactionDate(date);
  if (!time) return date;
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketSizeForRange(range: TimeRange): BucketSize {
  if (range === "1D" || range === "1W" || range === "1M") return "day";
  if (range === "3M") return "week";
  return "month";
}

export function bucketKey(date: string, bucketSize: BucketSize): string {
  if (bucketSize === "day") return dayKey(date);
  if (bucketSize === "week") return weekKey(date);
  return monthKey(date);
}

export function bucketMidpoint(key: string, bucketSize: BucketSize): { date: string; time: number } {
  if (bucketSize === "month") {
    const [year, month] = key.split("-").map(Number);
    const midpoint = new Date(year, month - 1, 15);
    return { date: midpoint.toISOString().slice(0, 10), time: midpoint.getTime() };
  }

  const time = parseTransactionDate(key);
  return { date: key, time: time || 0 };
}
