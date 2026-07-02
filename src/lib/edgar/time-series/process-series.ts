import type { RawTimeSeriesPoint, PeriodGap, SeriesFrequency } from "@/lib/edgar/time-series/types";
import { QUARTER_FPS } from "@/lib/edgar/time-series/constants";

function periodEndKey(periodEnd: string, frequency: SeriesFrequency): string {
  return `${frequency}:${periodEnd}`;
}

/** Deduplicate by (period_end, frequency), keeping the most recent filed date. */
export function dedupeSeries(
  points: RawTimeSeriesPoint[],
  frequency: SeriesFrequency,
): RawTimeSeriesPoint[] {
  const best = new Map<string, RawTimeSeriesPoint>();

  for (const point of points) {
    const key = periodEndKey(point.periodEnd, frequency);
    const existing = best.get(key);
    if (!existing || point.filed.localeCompare(existing.filed) > 0) {
      best.set(key, point);
    }
  }

  return [...best.values()].toSorted((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

function comparePeriod(
  a: { fy?: number; fp?: string },
  b: { fy?: number; fp?: string },
): number {
  const fyDiff = (a.fy ?? 0) - (b.fy ?? 0);
  if (fyDiff !== 0) return fyDiff;

  const fpOrder = (fp?: string) => {
    if (fp === "FY") return 4;
    const idx = QUARTER_FPS.indexOf(fp as (typeof QUARTER_FPS)[number]);
    return idx >= 0 ? idx : -1;
  };

  return fpOrder(a.fp) - fpOrder(b.fp);
}

function nextPeriod(fy: number, fp: string): { fy: number; fp: string } {
  if (fp === "FY") return { fy: fy + 1, fp: "FY" };

  const idx = QUARTER_FPS.indexOf(fp as (typeof QUARTER_FPS)[number]);
  if (idx < 0) return { fy, fp };
  if (idx < QUARTER_FPS.length - 1) {
    return { fy, fp: QUARTER_FPS[idx + 1] };
  }
  return { fy: fy + 1, fp: "Q1" };
}

function periodsBetween(
  from: { fy?: number; fp?: string; periodEnd: string },
  to: { fy?: number; fp?: string; periodEnd: string },
): PeriodGap[] {
  if (from.fy === undefined || to.fy === undefined || !from.fp || !to.fp) {
    return [];
  }

  const gaps: PeriodGap[] = [];
  let current = nextPeriod(from.fy, from.fp);

  while (comparePeriod(current, to) < 0) {
    gaps.push({
      expectedFy: current.fy,
      expectedFp: current.fp,
      afterPeriodEnd: from.periodEnd,
      beforePeriodEnd: to.periodEnd,
    });
    current = nextPeriod(current.fy, current.fp);
  }

  return gaps;
}

export function detectGaps(points: RawTimeSeriesPoint[]): PeriodGap[] {
  if (points.length < 2) return [];

  const gaps: PeriodGap[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    gaps.push(...periodsBetween(points[i], points[i + 1]));
  }
  return gaps;
}

function sortAscending(points: RawTimeSeriesPoint[]): RawTimeSeriesPoint[] {
  return points.toSorted((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}
