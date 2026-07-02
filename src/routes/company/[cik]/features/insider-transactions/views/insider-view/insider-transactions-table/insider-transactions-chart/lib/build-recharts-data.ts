import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import { OWNER_COLORS } from "../constants";
import type { LineSeries } from "../types";

export type ActivityBarRow = {
  date: string;
  buys: number;
  sells: number;
};

export type HoldingsSeriesMeta = {
  key: string;
  label: string;
  color: string;
};

export function buildActivityBarData(series: LineSeries[]): ActivityBarRow[] {
  const buysSeries = series.find((line) => line.id === "buys");
  const sellsSeries = series.find((line) => line.id === "sells");
  const dates = new Set<string>();

  for (const point of buysSeries?.points ?? []) dates.add(point.date);
  for (const point of sellsSeries?.points ?? []) dates.add(point.date);

  return [...dates].sort().map((date) => ({
    date,
    buys: buysSeries?.points.find((point) => point.date === date)?.value ?? 0,
    sells: sellsSeries?.points.find((point) => point.date === date)?.value ?? 0,
  }));
}

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
    data: [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
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
