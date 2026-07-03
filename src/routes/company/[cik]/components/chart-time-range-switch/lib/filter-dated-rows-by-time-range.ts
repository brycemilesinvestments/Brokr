import { CHART_TIME_RANGE_OPTIONS } from "../constants";
import type { ChartTimeRange } from "../types";

function parseDateMs(value: string): number {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function latestRowTime<T extends { date: string }>(rows: T[]): number {
  let latest = 0;
  for (const row of rows) {
    const time = parseDateMs(row.date);
    if (time > latest) latest = time;
  }
  return latest > 0 ? latest : Date.now();
}

export function filterDatedRowsByTimeRange<T extends { date: string }>(
  rows: T[],
  range: ChartTimeRange,
  latestTime = latestRowTime(rows),
): T[] {
  const option = CHART_TIME_RANGE_OPTIONS.find((entry) => entry.value === range);
  if (!option?.ms) return rows;

  const cutoff = latestTime - option.ms;
  return rows.filter((row) => parseDateMs(row.date) >= cutoff);
}
