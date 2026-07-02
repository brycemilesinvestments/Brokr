import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";

export type SharesChartRow = OutstandingSharePoint & {
  date: string;
  shares: number;
};

export function buildSharesChartData(points: OutstandingSharePoint[]): SharesChartRow[] {
  return points
    .toSorted((a, b) => a.asOfDate.localeCompare(b.asOfDate))
    .map((point) => ({
      ...point,
      date: point.asOfDate,
      shares: point.shares,
    }));
}
