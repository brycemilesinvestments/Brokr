import type { FredChartRow } from "../types";

export function buildFredChartRows(
  observations: Array<{ observation_date: string; value: number }>,
): FredChartRow[] {
  const rows: FredChartRow[] = [];

  for (const row of observations) {
    if (!Number.isFinite(row.value)) continue;
    rows.push({
      date: row.observation_date,
      value: row.value,
    });
  }

  return rows;
}
