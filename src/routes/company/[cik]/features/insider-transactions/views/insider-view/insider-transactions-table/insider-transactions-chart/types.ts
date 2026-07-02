import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

export type InsiderTransactionsChartProps = {
  transactions: InsiderTransaction[];
};

export type ChartMode = "activity" | "holdings";
export type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y" | "MAX";
export type BucketSize = "day" | "week" | "month";

export type SeriesPoint = {
  date: string;
  time: number;
  value: number;
};

export type LineSeries = {
  id: string;
  label: string;
  color: string;
  points: SeriesPoint[];
};

export type SnapPoint = {
  time: number;
  date: string;
  x: number;
};

export type HoverState = {
  x: number;
  date: string;
  time: number;
  entries: Array<{ label: string; color: string; value: number }>;
};

export type ChartGeometry = {
  lines: Array<LineSeries & { chartPoints: Array<SeriesPoint & { x: number; y: number }> }>;
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
  yMin: number;
  yMax: number;
  snapPoints: SnapPoint[];
};
