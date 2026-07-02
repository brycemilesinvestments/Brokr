import { safeDivide } from "@/lib/analysis/ratios";
import type { MetricSeries, MetricSeriesBundle, SeriesFrequency } from "@/lib/edgar/time-series";
import type { RatioSeriesKey, RatioSeriesPoint } from "@/lib/analysis/time-series/types";

type RatioDefinition = {
  key: RatioSeriesKey;
  numerator: string;
  denominator: string;
};

const RATIO_DEFINITIONS: RatioDefinition[] = [
  { key: "gross_margin", numerator: "GrossProfit", denominator: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  { key: "operating_margin", numerator: "OperatingIncomeLoss", denominator: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  { key: "net_margin", numerator: "NetIncomeLoss", denominator: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  { key: "current_ratio", numerator: "AssetsCurrent", denominator: "LiabilitiesCurrent" },
  { key: "debt_to_equity", numerator: "Liabilities", denominator: "StockholdersEquity" },
  { key: "return_on_equity", numerator: "NetIncomeLoss", denominator: "StockholdersEquity" },
];

function valueAtPeriod(
  series: MetricSeries | undefined,
  periodEnd: string,
  frequency: SeriesFrequency,
): number | undefined {
  if (!series) return undefined;
  const points = frequency === "annual" ? series.annual : series.quarterly;
  return points.find((p) => p.periodEnd === periodEnd)?.value;
}

function anchorPeriods(
  metrics: MetricSeriesBundle,
  frequency: SeriesFrequency,
): Array<{ periodEnd: string; fy?: number; fp?: string }> {
  const revenue = metrics.series.RevenueFromContractWithCustomerExcludingAssessedTax;
  if (!revenue || revenue.status === "not_reported") return [];

  const points = frequency === "annual" ? revenue.annual : revenue.quarterly;
  return points.map((p) => ({ periodEnd: p.periodEnd, fy: p.fy, fp: p.fp }));
}

function buildRatioSeries(
  metrics: MetricSeriesBundle,
  definition: RatioDefinition,
  frequency: SeriesFrequency,
): RatioSeriesPoint[] {
  const numerSeries = metrics.series[definition.numerator];
  const denomSeries = metrics.series[definition.denominator];
  const periods = anchorPeriods(metrics, frequency);

  return periods.map(({ periodEnd, fy, fp }) => ({
    periodEnd,
    frequency,
    fy,
    fp,
    value: safeDivide(
      valueAtPeriod(numerSeries, periodEnd, frequency),
      valueAtPeriod(denomSeries, periodEnd, frequency),
    ),
  }));
}

export function computeRatioSeries(
  metrics: MetricSeriesBundle,
): Record<RatioSeriesKey, RatioSeriesPoint[]> {
  const result = {} as Record<RatioSeriesKey, RatioSeriesPoint[]>;

  for (const definition of RATIO_DEFINITIONS) {
    result[definition.key] = [
      ...buildRatioSeries(metrics, definition, "annual"),
      ...buildRatioSeries(metrics, definition, "quarterly"),
    ];
  }

  return result;
}

export function ratioSeriesForFrequency(
  ratioSeries: Record<RatioSeriesKey, RatioSeriesPoint[]>,
  key: RatioSeriesKey,
  frequency: SeriesFrequency,
): RatioSeriesPoint[] {
  return ratioSeries[key].filter((p) => p.frequency === frequency);
}
