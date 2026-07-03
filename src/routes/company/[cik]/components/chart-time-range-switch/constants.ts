import type { ChartTimeRange } from "./types";

export const CHART_TIME_RANGE_OPTIONS: Array<{
  value: ChartTimeRange;
  label: string;
  ms: number | null;
}> = [
  { value: "1D", label: "1D", ms: 1 * 86_400_000 },
  { value: "1W", label: "1W", ms: 7 * 86_400_000 },
  { value: "1M", label: "1M", ms: 30 * 86_400_000 },
  { value: "3M", label: "3M", ms: 91 * 86_400_000 },
  { value: "1Y", label: "1Y", ms: 365 * 86_400_000 },
  { value: "5Y", label: "5Y", ms: 5 * 365 * 86_400_000 },
  { value: "MAX", label: "MAX", ms: null },
];
