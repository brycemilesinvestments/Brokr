import type { TimeRange } from "./types";
import { CHART_TIME_RANGE_OPTIONS } from "@/routes/company/[cik]/components/chart-time-range-switch";

export const DIVERGING_CHART_WIDTH = 800;
export const DIVERGING_CHART_HEIGHT = 314;
export const DIVERGING_PADDING = { top: 26, right: 62, bottom: 38, left: 62 };
export const DIVERGING_ZERO_Y = 164;
export const DIVERGING_COLORS = {
  acquired: "#047857",
  disposed: "#dc2626",
  grid: "#f0f0f1",
  zeroLine: "#3f3f46",
  axisLabel: "#a1a1aa",
  monthLabel: "#71717a",
} as const;

export const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string; ms: number | null }> =
  CHART_TIME_RANGE_OPTIONS;

export const NET_POSITION_BAR_HEIGHT = 12;
export const NET_POSITION_BODY_HEIGHT_CLASS = "h-[min(420px,50vh)] min-h-[280px]";
export const NET_POSITION_COLORS = {
  acquired: "#047857",
  disposed: "#dc2626",
} as const;

export const OWNER_COLORS = [
  "#047857",
  "#2563eb",
  "#9333ea",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#65a30d",
  "#4f46e5",
];
