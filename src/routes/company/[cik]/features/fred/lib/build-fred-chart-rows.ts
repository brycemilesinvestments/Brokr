import type { FredChartRow } from "../types";

export function buildFredChartRows(
  observations: Array<{ observation_date: string; value: number }>,
): FredChartRow[] {
  return observations
    .filter((row) => Number.isFinite(row.value))
    .map((row) => ({
      date: row.observation_date,
      value: row.value,
    }));
}
