import type { Time } from "lightweight-charts";
import type { MetricChartRow } from "./build-metric-chart-geometry";

export type MetricTradingViewSeries = {
  seriesData: Array<{ time: Time; value: number }>;
  rowsByDate: Map<string, MetricChartRow>;
};

function pickPreferredRow(current: MetricChartRow, candidate: MetricChartRow): MetricChartRow {
  if (candidate.frequency === "annual" && current.frequency !== "annual") {
    return candidate;
  }
  return current;
}

export function prepareMetricTradingViewData(rows: MetricChartRow[]): MetricTradingViewSeries {
  const grouped = new Map<string, MetricChartRow>();

  for (const row of rows) {
    const existing = grouped.get(row.date);
    grouped.set(row.date, existing ? pickPreferredRow(existing, row) : row);
  }

  const datedRows = [...grouped.values()].toSorted((a, b) => a.date.localeCompare(b.date));

  return {
    seriesData: datedRows.map((row) => ({
      time: row.date as Time,
      value: row.value,
    })),
    rowsByDate: new Map(datedRows.map((row) => [row.date, row])),
  };
}
