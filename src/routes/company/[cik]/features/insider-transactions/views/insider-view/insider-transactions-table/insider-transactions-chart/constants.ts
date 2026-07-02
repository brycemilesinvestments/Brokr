import type { TimeRange } from "./types";

const CHART_WIDTH = 800;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 24, bottom: 44, left: 72 };

export const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string; ms: number | null }> = [
  { value: "1D", label: "1D", ms: 1 * 86_400_000 },
  { value: "1W", label: "1W", ms: 7 * 86_400_000 },
  { value: "1M", label: "1M", ms: 30 * 86_400_000 },
  { value: "3M", label: "3M", ms: 91 * 86_400_000 },
  { value: "1Y", label: "1Y", ms: 365 * 86_400_000 },
  { value: "5Y", label: "5Y", ms: 5 * 365 * 86_400_000 },
  { value: "MAX", label: "MAX", ms: null },
];

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
