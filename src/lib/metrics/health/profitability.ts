/**
 * H1 — Profitability sub-score.
 * Inputs: net_margin, gross_margin, operating_margin, return_on_equity.
 * All values are decimal ratios (0.20 = 20%).
 */
import type { RatioSeriesKey, RatioSeriesPoint } from "@/lib/analysis/time-series/types";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import {
  GROSS_MARGIN_BREAKPOINTS,
  NET_MARGIN_BREAKPOINTS,
  OPERATING_MARGIN_BREAKPOINTS,
  RETURN_ON_EQUITY_BREAKPOINTS,
} from "@/lib/metrics/health/constants";
import { clampScore, piecewiseScore, weightedAverage } from "@/lib/metrics/health/score-utils";
import type { DrivingMetric, SubScore } from "@/lib/metrics/health/types";

function ratioAt(
  series: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  key: RatioSeriesKey,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  return series[key].find((p) => p.periodEnd === periodEnd && p.frequency === frequency)?.value;
}

/** Compute the Profitability sub-score for a single period. */
export function computeProfitabilitySubScore(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  periodEnd: string,
  frequency: SeriesFrequency,
): SubScore {
  const netMargin = ratioAt(ratioSeries, "net_margin", periodEnd, frequency);
  const grossMargin = ratioAt(ratioSeries, "gross_margin", periodEnd, frequency);
  const opMargin = ratioAt(ratioSeries, "operating_margin", periodEnd, frequency);
  const roe = ratioAt(ratioSeries, "return_on_equity", periodEnd, frequency);

  const netScore = netMargin !== undefined ? piecewiseScore(netMargin, NET_MARGIN_BREAKPOINTS) : undefined;
  const grossScore = grossMargin !== undefined ? piecewiseScore(grossMargin, GROSS_MARGIN_BREAKPOINTS) : undefined;
  const opScore = opMargin !== undefined ? piecewiseScore(opMargin, OPERATING_MARGIN_BREAKPOINTS) : undefined;
  const roeScore = roe !== undefined ? piecewiseScore(roe, RETURN_ON_EQUITY_BREAKPOINTS) : undefined;

  const score = clampScore(
    weightedAverage([
      [netScore, 0.40],
      [grossScore, 0.25],
      [opScore, 0.25],
      [roeScore, 0.10],
    ]),
  );

  const inputs: DrivingMetric[] = [
    {
      metricKey: "net_margin",
      label: "Net Margin",
      value: netMargin,
      drillDownPath: "/company/{cik}/metrics#net_margin",
    },
    {
      metricKey: "gross_margin",
      label: "Gross Margin",
      value: grossMargin,
      drillDownPath: "/company/{cik}/metrics#gross_margin",
    },
    {
      metricKey: "operating_margin",
      label: "Operating Margin",
      value: opMargin,
      drillDownPath: "/company/{cik}/metrics#operating_margin",
    },
    {
      metricKey: "return_on_equity",
      label: "Return on Equity",
      value: roe,
      drillDownPath: "/company/{cik}/metrics#return_on_equity",
    },
  ];

  return { key: "profitability", score, inputs };
}
