import type { MetricSeriesBundle } from "@/lib/edgar/time-series";
import {
  COGS_CONCEPT,
  REVENUE_CONCEPT,
} from "@/lib/metrics/constants";
import {
  buildDerivedSeries,
  daysInPeriod,
  getMetricSeries,
  pointAtPeriod,
  ratioOf,
  valueAtPeriod,
} from "@/lib/metrics/series-helpers";
import type { MissingMetricReason, WorkingCapital } from "@/lib/metrics/types";

const AR_CONCEPT = "AccountsReceivableNetCurrent";
const INVENTORY_CONCEPT = "InventoryNet";
const AP_CONCEPT = "AccountsPayableCurrent";

export function computeWorkingCapital(
  metrics: MetricSeriesBundle,
): { workingCapital: WorkingCapital; missing: MissingMetricReason[] } {
  const revenue = getMetricSeries(metrics, REVENUE_CONCEPT);
  const ar = getMetricSeries(metrics, AR_CONCEPT);
  const inventory = getMetricSeries(metrics, INVENTORY_CONCEPT);
  const cogs = getMetricSeries(metrics, COGS_CONCEPT);
  const ap = getMetricSeries(metrics, AP_CONCEPT);

  const missing: MissingMetricReason[] = [];

  const { series: dso, missing: dsoMissing } = buildDerivedSeries(
    "dso",
    revenue,
    (period) => {
      const rev = valueAtPeriod(revenue, period.periodEnd, period.frequency);
      const arVal = valueAtPeriod(ar, period.periodEnd, period.frequency);
      const revPoint = pointAtPeriod(revenue, period.periodEnd, period.frequency);

      if (arVal === undefined) {
        return { skipReason: "missing accounts receivable", missingConcept: AR_CONCEPT };
      }
      if (rev === undefined || rev === 0) {
        return {
          skipReason: rev === 0 ? "zero revenue" : "missing revenue",
          missingConcept: REVENUE_CONCEPT,
        };
      }

      const days = daysInPeriod(revPoint, period.frequency);
      const ratio = ratioOf(arVal, rev);
      if (ratio === undefined) return { skipReason: "zero revenue" };
      return { value: ratio * days };
    },
  );
  missing.push(...dsoMissing);

  const { series: dio, missing: dioMissing } = buildDerivedSeries(
    "dio",
    revenue,
    (period) => {
      const cogsVal = valueAtPeriod(cogs, period.periodEnd, period.frequency);
      const invVal = valueAtPeriod(inventory, period.periodEnd, period.frequency);
      const revPoint = pointAtPeriod(revenue, period.periodEnd, period.frequency);

      if (invVal === undefined) {
        return { skipReason: "missing inventory", missingConcept: INVENTORY_CONCEPT };
      }
      if (cogsVal === undefined) {
        return { skipReason: "missing COGS", missingConcept: COGS_CONCEPT };
      }
      if (cogsVal === 0) {
        return { skipReason: "zero COGS", missingConcept: COGS_CONCEPT };
      }

      const days = daysInPeriod(revPoint, period.frequency);
      const ratio = ratioOf(invVal, cogsVal);
      if (ratio === undefined) return { skipReason: "zero COGS" };
      return { value: ratio * days };
    },
  );
  missing.push(...dioMissing);

  const { series: dpo, missing: dpoMissing } = buildDerivedSeries(
    "dpo",
    revenue,
    (period) => {
      const cogsVal = valueAtPeriod(cogs, period.periodEnd, period.frequency);
      const apVal = valueAtPeriod(ap, period.periodEnd, period.frequency);
      const revPoint = pointAtPeriod(revenue, period.periodEnd, period.frequency);

      if (!ap || ap.status === "not_reported") {
        return { skipReason: "missing accounts payable", missingConcept: AP_CONCEPT };
      }
      if (apVal === undefined) {
        return { skipReason: "missing accounts payable", missingConcept: AP_CONCEPT };
      }
      if (cogsVal === undefined || cogsVal === 0) {
        return {
          skipReason: cogsVal === 0 ? "zero COGS" : "missing COGS",
          missingConcept: COGS_CONCEPT,
        };
      }

      const days = daysInPeriod(revPoint, period.frequency);
      const ratio = ratioOf(apVal, cogsVal);
      if (ratio === undefined) return { skipReason: "zero COGS" };
      return { value: ratio * days };
    },
  );
  missing.push(...dpoMissing);

  const { series: cashConversionCycle, missing: cccMissing } = buildDerivedSeries(
    "cash_conversion_cycle",
    revenue,
    (period) => {
      const dsoPoint = [...dso.annual, ...dso.quarterly].find(
        (p) => p.periodEnd === period.periodEnd && p.frequency === period.frequency,
      );
      const dioPoint = [...dio.annual, ...dio.quarterly].find(
        (p) => p.periodEnd === period.periodEnd && p.frequency === period.frequency,
      );
      const dpoPoint = [...dpo.annual, ...dpo.quarterly].find(
        (p) => p.periodEnd === period.periodEnd && p.frequency === period.frequency,
      );

      if (dsoPoint?.value === undefined) {
        return { skipReason: dsoPoint?.skipReason ?? "missing DSO" };
      }
      if (dioPoint?.value === undefined) {
        return { skipReason: dioPoint?.skipReason ?? "missing DIO" };
      }
      if (dpoPoint?.value === undefined) {
        return { skipReason: dpoPoint?.skipReason ?? "missing DPO" };
      }

      return { value: dsoPoint.value + dioPoint.value - dpoPoint.value };
    },
  );
  missing.push(...cccMissing);

  return {
    workingCapital: { dso, dio, dpo, cashConversionCycle },
    missing,
  };
}
