import type { RatioSeriesKey } from "@/lib/analysis";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import type { DerivedMetricSeries } from "@/lib/metrics/types";
import { computeSeverity } from "@/lib/metrics/trends/severity";
import type {
  DirectionalTrend,
  TrendConfig,
  TrendDetectionInput,
  TrendDirection,
} from "@/lib/metrics/trends/types";

type ValuePoint = { periodEnd: string; value: number };

export const DIRECTIONAL_RATIO_KEYS: RatioSeriesKey[] = [
  "gross_margin",
  "operating_margin",
  "net_margin",
  "current_ratio",
  "debt_to_equity",
  "return_on_equity",
];

export function extractRatioPoints(
  ratioSeries: TrendDetectionInput["timeSeries"]["ratioSeries"],
  key: RatioSeriesKey,
  frequency: SeriesFrequency,
): ValuePoint[] {
  const points = ratioSeries[key].reduce<ValuePoint[]>((acc, p) => {
    if (p.frequency === frequency && p.value !== undefined) {
      acc.push({ periodEnd: p.periodEnd, value: p.value });
    }
    return acc;
  }, []);
  return points.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

export function extractDerivedPoints(
  series: DerivedMetricSeries,
  frequency: SeriesFrequency,
): ValuePoint[] {
  if (series.status === "not_reported") return [];
  const pts = frequency === "annual" ? series.annual : series.quarterly;
  return pts
    .filter((p) => p.value !== undefined)
    .map((p) => ({ periodEnd: p.periodEnd, value: p.value! }))
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

function detectRunsInSeries(
  metric: string,
  frequency: SeriesFrequency,
  points: ValuePoint[],
  minRunLength: number,
): DirectionalTrend[] {
  const trends: DirectionalTrend[] = [];
  if (points.length < minRunLength) return trends;

  let runStart = 0;
  let runDir: TrendDirection | null = null;
  let runLen = 1;

  const flush = (endIdx: number) => {
    if (runDir === null || runLen < minRunLength) return;
    const magnitude = points[endIdx].value - points[runStart].value;
    const severity = computeSeverity(magnitude, points[runStart].value, runLen);
    trends.push({
      metric,
      frequency,
      direction: runDir,
      run_length: runLen,
      start_period: points[runStart].periodEnd,
      end_period: points[endIdx].periodEnd,
      magnitude,
      severity,
    });
  };

  for (let i = 1; i < points.length; i++) {
    const delta = points[i].value - points[i - 1].value;

    if (delta === 0) {
      // Flat: continue current direction (or treat as "up" if no direction yet)
      if (runDir === null) {
        runDir = "up";
        runLen = 2;
        runStart = 0;
      } else {
        runLen++;
      }
    } else {
      const dir: TrendDirection = delta > 0 ? "up" : "down";
      if (runDir === null) {
        runDir = dir;
        runLen = 2;
        runStart = 0;
      } else if (dir === runDir) {
        runLen++;
      } else {
        flush(i - 1);
        runStart = i - 1;
        runLen = 2;
        runDir = dir;
      }
    }
  }
  flush(points.length - 1);

  return trends;
}

/** Detect sustained directional runs (>= minRunLength) across ratio and derived metric series. */
export function detectDirectional(
  input: TrendDetectionInput,
  config: TrendConfig,
): DirectionalTrend[] {
  const { timeSeries, metricsBundle } = input;
  const { minRunLength } = config;
  const result: DirectionalTrend[] = [];

  for (const freq of ["annual", "quarterly"] as const) {
    for (const key of DIRECTIONAL_RATIO_KEYS) {
      const pts = extractRatioPoints(timeSeries.ratioSeries, key, freq);
      result.push(...detectRunsInSeries(key, freq, pts, minRunLength));
    }

    const derivedEntries: [string, DerivedMetricSeries][] = [
      ["fcf_margin", metricsBundle.cashFlowQuality.fcfMargin],
      ["dso", metricsBundle.workingCapital.dso],
      ["sbc_pct_revenue", metricsBundle.dilution.sbcPctRevenue],
      ["share_count_trend", metricsBundle.dilution.shareCountTrend],
    ];

    for (const [key, series] of derivedEntries) {
      const pts = extractDerivedPoints(series, freq);
      result.push(...detectRunsInSeries(key, freq, pts, minRunLength));
    }
  }

  return result;
}
