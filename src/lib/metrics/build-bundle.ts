import type { TimeSeriesBundle } from "@/lib/analysis";
import type { CompanyFactsResponse, XbrlFact } from "@/lib/edgar";
import { computeBacklogSeries } from "@/lib/metrics/backlog";
import { computeCashFlowQuality } from "@/lib/metrics/cashflow";
import { derivedToChartPoints, toMetricsChartBundle } from "@/lib/metrics/chart-bundle";
import { computeDilutionMetrics } from "@/lib/metrics/dilution";
import { computeSegmentBreakout } from "@/lib/metrics/segments";
import { computeWorkingCapital } from "@/lib/metrics/working-capital";
import type { ExtendedMetricsBundle, ExtendedMetricsState } from "@/lib/metrics/types";

export function buildExtendedMetricsBundle(
  timeSeries: TimeSeriesBundle,
  rawFacts: CompanyFactsResponse,
  ixbrlFacts: XbrlFact[] = [],
): ExtendedMetricsBundle {
  const { cashFlowQuality, missing: cfMissing } = computeCashFlowQuality(
    timeSeries.metrics,
    rawFacts,
  );
  const { workingCapital, missing: wcMissing } = computeWorkingCapital(timeSeries.metrics);
  const { dilution, missing: dilMissing } = computeDilutionMetrics(
    timeSeries.metrics,
    rawFacts,
  );
  const backlog = computeBacklogSeries(rawFacts);
  const segments = computeSegmentBreakout(ixbrlFacts);

  const missing = [...cfMissing, ...wcMissing, ...dilMissing];

  const derived = [
    cashFlowQuality.freeCashFlow,
    cashFlowQuality.fcfMargin,
    cashFlowQuality.capexIntensity,
    workingCapital.dso,
    workingCapital.dio,
    workingCapital.dpo,
    workingCapital.cashConversionCycle,
    dilution.sbcPctRevenue,
    dilution.shareCountTrend,
    dilution.netIssuance,
  ];

  const notReported = [];
  if (backlog.status === "not_reported") {
    notReported.push({ metric: backlog.concept, status: "not_reported" as const });
  }

  const chart = toMetricsChartBundle({
    derived,
    segments: [...segments.endMarket, ...segments.geography],
    backlogKey: backlog.concept,
    backlogPoints: derivedToChartPoints({
      key: "free_cash_flow",
      status: backlog.status,
      annual: backlog.annual,
      quarterly: backlog.quarterly,
    }),
  });

  return {
    cik: timeSeries.cik,
    entityName: timeSeries.entityName,
    cashFlowQuality,
    workingCapital,
    dilution,
    segments,
    backlog,
    missing,
    notReported,
    chart,
  };
}

export function buildExtendedMetricsState(
  timeSeries: TimeSeriesBundle,
  rawFacts: CompanyFactsResponse,
  ixbrlFacts: XbrlFact[] = [],
): ExtendedMetricsState {
  return {
    cik: timeSeries.cik,
    bundle: buildExtendedMetricsBundle(timeSeries, rawFacts, ixbrlFacts),
  };
}
