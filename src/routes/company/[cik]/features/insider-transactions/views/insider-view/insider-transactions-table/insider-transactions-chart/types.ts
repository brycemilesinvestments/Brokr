import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import type { ChartTimeRange } from "@/routes/company/[cik]/components/chart-time-range-switch";

export type InsiderTransactionsChartProps = {
  transactions: InsiderTransaction[];
  ticker?: string;
};

export type ChartMode = "activity" | "holdings";
export type HoldingsView = "timeline" | "net-position";
export type TimeRange = ChartTimeRange;
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

export type NetPositionRow = {
  owner: string;
  ownerType?: string;
  netShares: number;
  transactions: InsiderTransaction[];
};

export type NetPositionBarGeometry = {
  owner: string;
  ownerType?: string;
  netShares: number;
  transactions: InsiderTransaction[];
  direction: "acquired" | "disposed";
  barHalfFraction: number;
};

export type ChartGeometry = {
  lines: Array<LineSeries & { chartPoints: Array<SeriesPoint & { x: number; y: number }> }>;
  yTicks: number[];
  xLabels: Array<{ x: number; label: string }>;
  yMin: number;
  yMax: number;
  snapPoints: SnapPoint[];
};
