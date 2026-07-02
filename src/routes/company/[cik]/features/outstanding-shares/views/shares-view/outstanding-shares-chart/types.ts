import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";

export type OutstandingSharesChartProps = {
  points: OutstandingSharePoint[];
};

export type ChartPoint = OutstandingSharePoint & {
  x: number;
  y: number;
};
