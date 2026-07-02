import type { CompanyFactsResponse } from "@/lib/edgar";
import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import {
  DILUTED_SHARES_CONCEPT,
  REVENUE_CONCEPT,
} from "@/lib/metrics/constants";
import {
  buildConceptSeriesFromFacts,
  buildDerivedSeries,
  getMetricSeries,
  ratioOf,
  valueAtPeriod,
} from "@/lib/metrics/series-helpers";
import type { DilutionMetrics, MissingMetricReason } from "@/lib/metrics/types";

const SBC_CONCEPT = "ShareBasedCompensation";

export function computeDilutionMetrics(
  metrics: MetricSeriesBundle,
  rawFacts: CompanyFactsResponse,
): { dilution: DilutionMetrics; missing: MissingMetricReason[] } {
  const revenue = getMetricSeries(metrics, REVENUE_CONCEPT);
  const sbcSeries = buildConceptSeriesFromFacts(rawFacts, SBC_CONCEPT);
  const shares = getMetricSeries(metrics, DILUTED_SHARES_CONCEPT);

  const missing: MissingMetricReason[] = [];

  const { series: sbcPctRevenue, missing: sbcMissing } = buildDerivedSeries(
    "sbc_pct_revenue",
    revenue,
    (period) => {
      const sbc = valueAtPeriod(sbcSeries, period.periodEnd, period.frequency);
      const rev = valueAtPeriod(revenue, period.periodEnd, period.frequency);

      if (sbc === undefined) {
        return { skipReason: "missing share-based compensation", missingConcept: SBC_CONCEPT };
      }
      if (rev === undefined) {
        return { skipReason: "missing revenue", missingConcept: REVENUE_CONCEPT };
      }

      const value = ratioOf(sbc, rev);
      if (value === undefined) {
        return { skipReason: "zero revenue", missingConcept: REVENUE_CONCEPT };
      }
      return { value };
    },
  );
  missing.push(...sbcMissing);

  const { series: shareCountTrend, missing: shareMissing } = buildDerivedSeries(
    "share_count_trend",
    shares,
    (period) => {
      const count = valueAtPeriod(shares, period.periodEnd, period.frequency);
      if (count === undefined) {
        return {
          skipReason: "missing diluted share count",
          missingConcept: DILUTED_SHARES_CONCEPT,
        };
      }
      return { value: count };
    },
  );
  missing.push(...shareMissing);

  const { series: netIssuance, missing: issuanceMissing } = buildDerivedSeries(
    "net_issuance",
    shares,
    (period, anchorPoint) => {
      if (!shares || shares.status === "not_reported" || !anchorPoint) {
        return {
          skipReason: "missing diluted share count",
          missingConcept: DILUTED_SHARES_CONCEPT,
        };
      }

      const points = period.frequency === "annual" ? shares.annual : shares.quarterly;
      const idx = points.findIndex((p) => p.periodEnd === period.periodEnd);
      if (idx <= 0) {
        return { skipReason: "no prior period for net issuance" };
      }

      const current = points[idx]?.value;
      const prior = points[idx - 1]?.value;
      if (current === undefined || prior === undefined) {
        return { skipReason: "missing share count for period pair" };
      }

      return { value: current - prior };
    },
  );
  missing.push(...issuanceMissing);

  return {
    dilution: { sbcPctRevenue, shareCountTrend, netIssuance },
    missing,
  };
}
