import type { FredChartRow } from "../types";

export type FredRangeStats = {
  latestValue: number;
  latestDate: string;
  rangeChange: number;
  rangeHigh: number;
  rangeLow: number;
};

export function computeFredRangeStats(rows: FredChartRow[]): FredRangeStats | null {
  if (rows.length === 0) return null;

  const first = rows[0]!;
  const latest = rows[rows.length - 1]!;

  let rangeHigh = latest.value;
  let rangeLow = latest.value;

  for (const row of rows) {
    if (row.value > rangeHigh) rangeHigh = row.value;
    if (row.value < rangeLow) rangeLow = row.value;
  }

  return {
    latestValue: latest.value,
    latestDate: latest.date,
    rangeChange: latest.value - first.value,
    rangeHigh,
    rangeLow,
  };
}
