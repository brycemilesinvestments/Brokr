import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import { OWNER_COLORS } from "../constants";
import type { LineSeries } from "../types";

export type HoldingsSeriesMeta = {
  key: string;
  label: string;
  color: string;
};

export function buildHoldingsLineData(series: LineSeries[]): {
  data: Array<Record<string, string | number>>;
  series: HoldingsSeriesMeta[];
} {
  const rows = new Map<string, Record<string, string | number>>();

  for (const line of series) {
    for (const point of line.points) {
      const existing = rows.get(point.date) ?? { date: point.date };
      existing[line.id] = point.value;
      rows.set(point.date, existing);
    }
  }

  return {
    data: [...rows.values()].toSorted((a, b) => String(a.date).localeCompare(String(b.date))),
    series: series.map((line, index) => ({
      key: line.id,
      label: line.label,
      color: line.color ?? OWNER_COLORS[index % OWNER_COLORS.length],
    })),
  };
}

export function buildHoldingsChartConfig(series: HoldingsSeriesMeta[]): ChartConfig {
  return Object.fromEntries(
    series.map((line) => [
      line.key,
      {
        label: line.label,
        colors: { light: [line.color] },
      },
    ]),
  );
}
