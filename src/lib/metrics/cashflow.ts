import type { CompanyFactsResponse } from "@/lib/edgar";
import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import {
  OPERATING_CF_CONCEPT,
  REVENUE_CONCEPT,
} from "@/lib/metrics/constants";
import {
  buildConceptSeriesFromFacts,
  buildDerivedSeries,
  getMetricSeries,
  ratioOf,
  subtractSeriesValues,
  valueAtPeriod,
} from "@/lib/metrics/series-helpers";
import type { CashFlowQuality, MissingMetricReason } from "@/lib/metrics/types";

const CAPEX_CONCEPT = "PaymentsToAcquirePropertyPlantAndEquipment";

export function computeCashFlowQuality(
  metrics: MetricSeriesBundle,
  rawFacts: CompanyFactsResponse,
): { cashFlowQuality: CashFlowQuality; missing: MissingMetricReason[] } {
  const operatingCf = getMetricSeries(metrics, OPERATING_CF_CONCEPT);
  const capexSeries = buildConceptSeriesFromFacts(rawFacts, CAPEX_CONCEPT);
  const revenue = getMetricSeries(metrics, REVENUE_CONCEPT);

  const missing: MissingMetricReason[] = [];

  const { series: freeCashFlow, missing: fcfMissing } = buildDerivedSeries(
    "free_cash_flow",
    operatingCf,
    (period) => {
      const ocf = valueAtPeriod(operatingCf, period.periodEnd, period.frequency);
      const capex = valueAtPeriod(capexSeries, period.periodEnd, period.frequency);

      if (ocf === undefined) {
        return {
          skipReason: "missing operating cash flow",
          missingConcept: OPERATING_CF_CONCEPT,
        };
      }
      if (capex === undefined) {
        return {
          skipReason: "missing capex",
          missingConcept: CAPEX_CONCEPT,
        };
      }

      return { value: subtractSeriesValues(ocf, capex) };
    },
  );
  missing.push(...fcfMissing);

  const { series: fcfMargin, missing: marginMissing } = buildDerivedSeries(
    "fcf_margin",
    operatingCf,
    (period) => {
      const fcfPoint = [...freeCashFlow.annual, ...freeCashFlow.quarterly].find(
        (p) => p.periodEnd === period.periodEnd && p.frequency === period.frequency,
      );
      const rev = valueAtPeriod(revenue, period.periodEnd, period.frequency);

      if (fcfPoint?.value === undefined) {
        return { skipReason: fcfPoint?.skipReason ?? "missing free cash flow" };
      }
      if (rev === undefined) {
        return {
          skipReason: "missing revenue",
          missingConcept: REVENUE_CONCEPT,
        };
      }

      const value = ratioOf(fcfPoint.value, rev);
      if (value === undefined) {
        return { skipReason: "zero revenue", missingConcept: REVENUE_CONCEPT };
      }
      return { value };
    },
  );
  missing.push(...marginMissing);

  const { series: capexIntensity, missing: capexMissing } = buildDerivedSeries(
    "capex_intensity",
    operatingCf,
    (period) => {
      const capex = valueAtPeriod(capexSeries, period.periodEnd, period.frequency);
      const rev = valueAtPeriod(revenue, period.periodEnd, period.frequency);

      if (capex === undefined) {
        return { skipReason: "missing capex", missingConcept: CAPEX_CONCEPT };
      }
      if (rev === undefined) {
        return {
          skipReason: "missing revenue",
          missingConcept: REVENUE_CONCEPT,
        };
      }

      const value = ratioOf(Math.abs(capex), rev);
      if (value === undefined) {
        return { skipReason: "zero revenue", missingConcept: REVENUE_CONCEPT };
      }
      return { value };
    },
  );
  missing.push(...capexMissing);

  return {
    cashFlowQuality: { freeCashFlow, fcfMargin, capexIntensity },
    missing,
  };
}
