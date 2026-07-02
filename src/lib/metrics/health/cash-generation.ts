/**
 * H1 — Cash Generation sub-score.
 * Inputs: FCF margin (primary), capex intensity (asset-intensity signal).
 * Both values are decimal ratios from ExtendedMetricsBundle.cashFlowQuality.
 */
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  CAPEX_INTENSITY_BREAKPOINTS,
  FCF_MARGIN_BREAKPOINTS,
} from "@/lib/metrics/health/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";
import type { CashFlowQuality } from "@/lib/metrics/types";

function derivedAt(
  points: ReadonlyArray<{ periodEnd: string; frequency: SeriesFrequency; value?: number }>,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return points.find((p) => p.periodEnd === periodEnd && p.frequency === frequency)?.value;
}

/** Compute the Cash Generation sub-score for a single period. */
export function computeCashGenerationSubScore(
  cashFlowQuality: CashFlowQuality,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const fcfPoints = frequency === "annual"
    ? cashFlowQuality.fcfMargin.annual
    : cashFlowQuality.fcfMargin.quarterly;

  const capexPoints = frequency === "annual"
    ? cashFlowQuality.capexIntensity.annual
    : cashFlowQuality.capexIntensity.quarterly;

  const fcfMargin = derivedAt(fcfPoints, periodEnd, frequency);
  const capexIntensity = derivedAt(capexPoints, periodEnd, frequency);

  const fcfScore =
    fcfMargin !== undefined ? piecewiseScore(fcfMargin, FCF_MARGIN_BREAKPOINTS) : undefined;

  const capexScore =
    capexIntensity !== undefined
      ? piecewiseScore(capexIntensity, CAPEX_INTENSITY_BREAKPOINTS)
      : undefined;

  const score = clampScore(
    weightedAverage([
      [fcfScore, 0.70],
      [capexScore, 0.30],
    ]),
  );

  const inputs: DrivingMetric[] = [
    {
      metricKey: "fcf_margin",
      label: "FCF Margin",
      value: fcfMargin,
      drillDownPath: "/company/{cik}/metrics#fcf_margin",
    },
    {
      metricKey: "capex_intensity",
      label: "Capex Intensity",
      value: capexIntensity,
      drillDownPath: "/company/{cik}/metrics#capex_intensity",
    },
  ];

  return { key: "cash_generation", score, inputs };
}
