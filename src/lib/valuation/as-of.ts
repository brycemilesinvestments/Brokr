import type { MetricSeries, MetricSeriesPoint } from "@/lib/edgar/time-series";

export type FiledSnapshot = {
  filedDate: string;
  asOfPeriodEnd: string;
};

/** Most recent item whose filedDate is on or before `asOfDate`. */
export function selectLatestFiledAsOf<T extends FiledSnapshot>(
  items: T[],
  asOfDate: string,
): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (item.filedDate.localeCompare(asOfDate) > 0) continue;
    if (!best || item.filedDate.localeCompare(best.filedDate) > 0) {
      best = item;
      continue;
    }
    if (
      item.filedDate === best.filedDate &&
      item.asOfPeriodEnd.localeCompare(best.asOfPeriodEnd) > 0
    ) {
      best = item;
    }
  }
  return best;
}

function allPoints(series: MetricSeries | undefined): MetricSeriesPoint[] {
  if (!series || series.status === "not_reported") return [];
  return [...series.annual, ...series.quarterly];
}

/** Balance-sheet point visible to the market on `asOfDate` (filed on or before). */
export function balancePointAsOf(
  series: MetricSeries | undefined,
  asOfDate: string,
): MetricSeriesPoint | undefined {
  const eligible = allPoints(series).filter((p) => p.filed.localeCompare(asOfDate) <= 0);
  if (eligible.length === 0) return undefined;

  return eligible.reduce((best, point) =>
    point.periodEnd.localeCompare(best.periodEnd) > 0 ? point : best,
  );
}
