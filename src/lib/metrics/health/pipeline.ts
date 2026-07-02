/**
 * Health score pipeline (H1–H6).
 *
 * ROUTER: compute_subscores → weight_composite → build_series → attach_framing
 *
 * Determinism guarantee: pure given fixed inputs; no I/O, no randomness.
 * Inject Date.now / network / random if time-dependency is needed downstream.
 */

import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  computeBalanceSheetScore,
  computeCashGenerationScore,
  computeDilutionScore,
  computeGrowthQualityScore,
  computeProfitabilityScore,
} from "@/lib/metrics/health/subscores";
import type {
  CompositeWeights,
  HealthScoreBundle,
  HealthScoreInput,
  HealthScorePoint,
  HealthSeries,
  SubScore,
} from "@/lib/metrics/health/types";
import { DEFAULT_WEIGHTS, HEALTH_FRAMING } from "@/lib/metrics/health/constants";

import { clampScore, weightedAverage } from "@/lib/metrics/health/score-utils";

/** @deprecated Use DEFAULT_WEIGHTS from constants. */
export const DEFAULT_HEALTH_WEIGHTS = DEFAULT_WEIGHTS;

/** @deprecated Use HEALTH_FRAMING from constants. */
export const FRAMING_LABEL = HEALTH_FRAMING;

// ── Period collection (H4) ────────────────────────────────────────────────────

type PeriodKey = { periodEnd: string; frequency: SeriesFrequency };

/**
 * Collect all reporting periods from ratio series and FCF margin.
 * Unions periods across sources so FCF-only periods extend the series (H4).
 */
function collectPeriods(input: HealthScoreInput): PeriodKey[] {
  const byKey = new Map<string, PeriodKey>();

  const add = (periodEnd: string, frequency: SeriesFrequency) => {
    byKey.set(`${periodEnd}|${frequency}`, { periodEnd, frequency });
  };

  const ratioAnchorKeys = [
    "net_margin",
    "gross_margin",
    "operating_margin",
    "current_ratio",
  ] as const;

  for (const key of ratioAnchorKeys) {
    for (const p of input.timeSeries.ratioSeries[key]) {
      if (p.value !== undefined) {
        add(p.periodEnd, p.frequency);
      }
    }
  }

  const { fcfMargin } = input.metricsBundle.cashFlowQuality;
  for (const p of fcfMargin.annual) {
    if (p.value !== undefined) add(p.periodEnd, "annual");
  }
  for (const p of fcfMargin.quarterly) {
    if (p.value !== undefined) add(p.periodEnd, "quarterly");
  }

  return [...byKey.values()];
}

function resolveWeights(overrides?: Partial<CompositeWeights>): CompositeWeights {
  const merged: CompositeWeights = {
    ...DEFAULT_WEIGHTS,
    ...overrides,
  };
  const total =
    merged.profitability +
    merged.growth_quality +
    merged.balance_sheet +
    merged.cash_generation +
    merged.dilution;

  if (Math.abs(total - 1.0) < 1e-9 || total <= 0) {
    return merged;
  }

  return {
    profitability: merged.profitability / total,
    growth_quality: merged.growth_quality / total,
    balance_sheet: merged.balance_sheet / total,
    cash_generation: merged.cash_generation / total,
    dilution: merged.dilution / total,
  };
}

// ── Composite weighting ───────────────────────────────────────────────────────

function weightComposite(subscores: SubScore[], weights: CompositeWeights): number {
  return clampScore(
    weightedAverage(subscores.map((s) => [s.score, weights[s.key]] as const)),
  );
}

// ── Main router ───────────────────────────────────────────────────────────────

/**
 * Compute the full HealthScoreBundle.
 *
 * Steps:
 * 1. compute_subscores — five sub-score calculators per period.
 * 2. weight_composite  — documented weighted average.
 * 3. build_series      — chronologically sorted HealthScorePoint[].
 * 4. attach_framing    — mandatory H5 diagnostic label.
 */
export function computeHealthScore(input: HealthScoreInput): HealthScoreBundle {
  const weights = resolveWeights(input.weights);

  const periods = collectPeriods(input).sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd),
  );

  // Step 1 + 2: compute_subscores → weight_composite
  const points: HealthScorePoint[] = periods.map(({ periodEnd, frequency }) => {
    const subscores: SubScore[] = [
      computeProfitabilityScore(input.timeSeries.ratioSeries, periodEnd, frequency),
      computeGrowthQualityScore(
        input.timeSeries.metrics,
        input.metricsBundle.cashFlowQuality.fcfMargin,
        periodEnd,
        frequency,
      ),
      computeBalanceSheetScore(input.timeSeries.ratioSeries, periodEnd, frequency),
      computeCashGenerationScore(
        input.timeSeries.ratioSeries,
        input.metricsBundle.cashFlowQuality.fcfMargin,
        periodEnd,
        frequency,
      ),
      computeDilutionScore(input.metricsBundle.dilution, periodEnd, frequency),
    ];

    return {
      periodEnd,
      frequency,
      composite: weightComposite(subscores, weights),
      subscores,
    };
  });

  // Step 3: build_series
  const series: HealthSeries = {
    cik: input.cik,
    entityName: input.entityName,
    weights,
    points,
    framing: FRAMING_LABEL,   // Step 4: attach_framing (H5)
  };

  return {
    series,
    ...(input.peer !== undefined ? { peerRelative: input.peer } : {}),
  };
}
