import type { SeriesFrequency } from "@/lib/edgar/time-series";
import { REVENUE_CONCEPT } from "@/lib/metrics/constants";
import type { DerivedMetricSeries } from "@/lib/metrics/types";
import type {
  DivergencePattern,
  TrendConfig,
  TrendDetectionInput,
  TrendSeverity,
} from "@/lib/metrics/trends/types";

const NET_INCOME_CONCEPT = "NetIncomeLoss";

/** AR growth rate must exceed revenue growth rate by at least this to flag (10pp). */
const AR_OUTPACING_THRESHOLD = 0.10;

/** Minimum positive margin compression per period to count toward the pattern. */
const MARGIN_COMPRESSION_FLOOR = 0.005;

/** Minimum revenue growth rate per period for the compression pattern. */
const REVENUE_GROWTH_FLOOR = 0.01;

/**
 * Consecutive period window minimum for multi-period divergence patterns.
 * Using a fixed 2 (below directional minRunLength) since divergence is qualitatively
 * different — it involves two metrics simultaneously, not just one series spiking.
 */
const DIVERGENCE_MIN_CONSECUTIVE = 2;

type PairResult = { holds: boolean; outpacing?: number };

function severityFromCount(count: number, totalMagnitude: number): TrendSeverity {
  if (count >= 4 || totalMagnitude >= 0.30) return "high";
  if (count >= 2 || totalMagnitude >= 0.10) return "med";
  return "low";
}

function getMetricPoints(
  series: DerivedMetricSeries | undefined,
  frequency: SeriesFrequency,
): { periodEnd: string; value: number }[] {
  if (!series || series.status === "not_reported") return [];
  const pts = frequency === "annual" ? series.annual : series.quarterly;
  return pts
    .filter((p) => p.value !== undefined)
    .map((p) => ({ periodEnd: p.periodEnd, value: p.value! }))
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

/** Detect runs of consecutive periods where `holdsFn` is true, minimum `minConsecutive`. */
function findConsecutiveRuns(
  periods: string[],
  holdsFn: (i: number) => PairResult,
  minConsecutive: number,
): { start: string; end: string; count: number; totalMag: number }[] {
  const runs: { start: string; end: string; count: number; totalMag: number }[] = [];
  let runStart = -1;
  let runCount = 0;
  let runMag = 0;

  for (let i = 0; i < periods.length - 1; i++) {
    const { holds, outpacing = 0 } = holdsFn(i);
    if (holds) {
      if (runStart < 0) runStart = i;
      runCount++;
      runMag += Math.abs(outpacing);
    } else {
      if (runCount >= minConsecutive) {
        runs.push({
          start: periods[runStart],
          end: periods[runStart + runCount],
          count: runCount,
          totalMag: runMag,
        });
      }
      runStart = -1;
      runCount = 0;
      runMag = 0;
    }
  }

  if (runCount >= minConsecutive) {
    runs.push({
      start: periods[runStart],
      end: periods[runStart + runCount],
      count: runCount,
      totalMag: runMag,
    });
  }

  return runs;
}

/**
 * T2-a: Receivables outpacing revenue.
 * Flags any period where AR growth rate exceeds revenue growth rate by >= AR_OUTPACING_THRESHOLD.
 * Single-period is sufficient here since the divergence between two metrics is
 * qualitatively different from a one-metric spike (which is handled by the anomaly layer).
 */
function detectReceivablesOutpacingRevenue(
  input: TrendDetectionInput,
  frequency: SeriesFrequency,
): DivergencePattern[] {
  const { timeSeries } = input;
  const arSeries = timeSeries.metrics.series.AccountsReceivableNetCurrent;
  const revSeries = timeSeries.metrics.series[REVENUE_CONCEPT];

  if (
    !arSeries || arSeries.status === "not_reported" ||
    !revSeries || revSeries.status === "not_reported"
  ) {
    return [];
  }

  const arPts = (frequency === "annual" ? arSeries.annual : arSeries.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const revPts = (frequency === "annual" ? revSeries.annual : revSeries.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  if (arPts.length < 2 || revPts.length < 2) return [];

  const flagged: { periodEnd: string; outpacing: number }[] = [];

  for (let i = 1; i < arPts.length; i++) {
    const arPrev = arPts[i - 1].value;
    const arCurr = arPts[i].value;
    if (arPrev === 0 || arPrev === undefined) continue;

    const arGrowth = (arCurr - arPrev) / Math.abs(arPrev);
    if (arGrowth <= 0) continue;

    // Find corresponding revenue period pair
    const revPrevPt = revPts.find((p) => p.periodEnd === arPts[i - 1].periodEnd);
    const revCurrPt = revPts.find((p) => p.periodEnd === arPts[i].periodEnd);
    if (!revPrevPt || !revCurrPt) continue;

    const revPrev = revPrevPt.value;
    const revCurr = revCurrPt.value;
    if (revPrev === 0 || revPrev === undefined) continue;

    const revGrowth = (revCurr - revPrev) / Math.abs(revPrev);
    const outpacing = arGrowth - revGrowth;

    if (outpacing >= AR_OUTPACING_THRESHOLD) {
      flagged.push({ periodEnd: arPts[i].periodEnd, outpacing });
    }
  }

  if (flagged.length === 0) return [];

  const maxOutpacing = Math.max(...flagged.map((f) => f.outpacing));
  const severity: TrendSeverity = maxOutpacing >= 0.30 ? "high" : maxOutpacing >= 0.15 ? "med" : "low";

  return [
    {
      name: "receivables_outpacing_revenue",
      description: "Accounts receivable growing faster than revenue — potential collection risk",
      frequency,
      start_period: flagged[0].periodEnd,
      end_period: flagged[flagged.length - 1].periodEnd,
      severity,
    },
  ];
}

/**
 * T2-b: Revenue growing while gross margins compress.
 * Requires DIVERGENCE_MIN_CONSECUTIVE consecutive such periods.
 */
function detectRevenueGrowthMarginCompression(
  input: TrendDetectionInput,
  frequency: SeriesFrequency,
): DivergencePattern[] {
  const { timeSeries } = input;
  const revSeries = timeSeries.metrics.series[REVENUE_CONCEPT];

  if (!revSeries || revSeries.status === "not_reported") return [];

  const revPts = (frequency === "annual" ? revSeries.annual : revSeries.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const gmPts = timeSeries.ratioSeries.gross_margin
    .filter((p) => p.frequency === frequency && p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  if (revPts.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];
  if (gmPts.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];

  // Align periods present in both series
  const commonPeriods = revPts
    .map((r) => r.periodEnd)
    .filter((d) => gmPts.some((g) => g.periodEnd === d));

  if (commonPeriods.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];

  const getRevGrowth = (a: string, b: string) => {
    const prev = revPts.find((p) => p.periodEnd === a)!.value;
    const curr = revPts.find((p) => p.periodEnd === b)!.value;
    return prev !== 0 ? (curr - prev) / Math.abs(prev) : 0;
  };

  const getGmChange = (a: string, b: string) => {
    const prev = gmPts.find((p) => p.periodEnd === a)!.value!;
    const curr = gmPts.find((p) => p.periodEnd === b)!.value!;
    return curr - prev;
  };

  const runs = findConsecutiveRuns(
    commonPeriods,
    (i) => {
      const revGrowth = getRevGrowth(commonPeriods[i], commonPeriods[i + 1]);
      const gmChange = getGmChange(commonPeriods[i], commonPeriods[i + 1]);
      const holds = revGrowth >= REVENUE_GROWTH_FLOOR && gmChange <= -MARGIN_COMPRESSION_FLOOR;
      return { holds, outpacing: holds ? Math.abs(gmChange) : 0 };
    },
    DIVERGENCE_MIN_CONSECUTIVE,
  );

  return runs.map((run) => ({
    name: "revenue_growth_margin_compression" as const,
    description: "Revenue growing while gross margins compress — pricing or cost pressure",
    frequency,
    start_period: run.start,
    end_period: run.end,
    severity: severityFromCount(run.count, run.totalMag),
  }));
}

/**
 * T2-c: Net income growing while free cash flow is flat or declining.
 * Requires DIVERGENCE_MIN_CONSECUTIVE consecutive such periods.
 */
function detectEarningsQualityGap(
  input: TrendDetectionInput,
  frequency: SeriesFrequency,
): DivergencePattern[] {
  const { timeSeries, metricsBundle } = input;
  const niSeries = timeSeries.metrics.series[NET_INCOME_CONCEPT];
  const fcfSeries = metricsBundle.cashFlowQuality.freeCashFlow;

  if (!niSeries || niSeries.status === "not_reported") return [];
  if (fcfSeries.status === "not_reported") return [];

  const niPts = (frequency === "annual" ? niSeries.annual : niSeries.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  const fcfPts = getMetricPoints(fcfSeries, frequency);

  if (niPts.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];
  if (fcfPts.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];

  const commonPeriods = niPts
    .map((p) => p.periodEnd)
    .filter((d) => fcfPts.some((f) => f.periodEnd === d));

  if (commonPeriods.length < DIVERGENCE_MIN_CONSECUTIVE + 1) return [];

  const runs = findConsecutiveRuns(
    commonPeriods,
    (i) => {
      const niPrev = niPts.find((p) => p.periodEnd === commonPeriods[i])!.value;
      const niCurr = niPts.find((p) => p.periodEnd === commonPeriods[i + 1])!.value;
      const fcfPrev = fcfPts.find((p) => p.periodEnd === commonPeriods[i])!.value;
      const fcfCurr = fcfPts.find((p) => p.periodEnd === commonPeriods[i + 1])!.value;

      const niUp = niCurr > niPrev;
      const fcfFlatOrDown = fcfCurr <= fcfPrev;
      return { holds: niUp && fcfFlatOrDown, outpacing: niUp && fcfFlatOrDown ? niCurr - niPrev : 0 };
    },
    DIVERGENCE_MIN_CONSECUTIVE,
  );

  return runs.map((run) => ({
    name: "earnings_quality_gap" as const,
    description: "Net income rising while free cash flow is flat or declining — earnings quality concern",
    frequency,
    start_period: run.start,
    end_period: run.end,
    severity: severityFromCount(run.count, run.totalMag),
  }));
}

/**
 * T2-d: Share count rising steadily (creeping dilution).
 * Requires minRunLength consecutive periods of share count increase.
 */
function detectCreepingDilution(
  input: TrendDetectionInput,
  frequency: SeriesFrequency,
  minRunLength: number,
): DivergencePattern[] {
  const { timeSeries } = input;

  // Use the primary diluted share count concept
  const sharesSeries =
    timeSeries.metrics.series.WeightedAverageNumberOfDilutedSharesOutstanding;

  if (!sharesSeries || sharesSeries.status === "not_reported") return [];

  const pts = (frequency === "annual" ? sharesSeries.annual : sharesSeries.quarterly)
    .filter((p) => p.value !== undefined)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  if (pts.length < minRunLength) return [];

  const periods = pts.map((p) => p.periodEnd);

  const runs = findConsecutiveRuns(
    periods,
    (i) => {
      const prev = pts[i].value;
      const curr = pts[i + 1].value;
      const growth = prev !== 0 ? (curr - prev) / Math.abs(prev) : 0;
      // Require at least small positive growth to avoid noise (rounding)
      return { holds: curr > prev && growth > 0.001, outpacing: growth };
    },
    minRunLength - 1, // findConsecutiveRuns counts transitions; N transitions = N+1 points
  );

  return runs.map((run) => ({
    name: "creeping_dilution" as const,
    description: "Share count rising steadily — creeping shareholder dilution",
    frequency,
    start_period: run.start,
    end_period: run.end,
    severity: severityFromCount(run.count, run.totalMag),
  }));
}

/** Detect all cross-metric divergence patterns. */
export function detectDivergence(
  input: TrendDetectionInput,
  config: TrendConfig,
): DivergencePattern[] {
  const { minRunLength } = config;
  const result: DivergencePattern[] = [];

  for (const freq of ["annual", "quarterly"] as const) {
    result.push(...detectReceivablesOutpacingRevenue(input, freq));
    result.push(...detectRevenueGrowthMarginCompression(input, freq));
    result.push(...detectEarningsQualityGap(input, freq));
    result.push(...detectCreepingDilution(input, freq, minRunLength));
  }

  // Deduplicate: keep the more severe pattern if same name+frequency appears twice
  const seen = new Map<string, DivergencePattern>();
  for (const p of result) {
    const key = `${p.name}:${p.frequency}`;
    const existing = seen.get(key);
    if (!existing || severityRank(p.severity) > severityRank(existing.severity)) {
      seen.set(key, p);
    }
  }

  return [...seen.values()];
}

function severityRank(s: TrendSeverity): number {
  return s === "high" ? 2 : s === "med" ? 1 : 0;
}
