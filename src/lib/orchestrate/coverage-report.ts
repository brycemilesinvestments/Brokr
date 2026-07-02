import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar";
import type { EventStudyResult } from "@/lib/insider";
import { MINIMUM_SIGNAL_EVENTS } from "@/lib/insider";
import type { ExtendedMetricsBundle } from "@/lib/metrics";
import type { TimeSeriesBundle } from "@/lib/analysis";
import type { ValuationBundle } from "@/lib/valuation";
import type { CoverageReport, PeriodRange, SegmentCoverage } from "@/lib/orchestrate/types";

function periodRange(dates: string[]): PeriodRange | undefined {
  if (dates.length === 0) return undefined;
  const sorted = [...dates].sort();
  return {
    earliest: sorted[0],
    latest: sorted[sorted.length - 1],
    pointCount: dates.length,
  };
}

function collectPeriodEnds(timeSeries: TimeSeriesBundle, frequency: "annual" | "quarterly"): string[] {
  const dates: string[] = [];
  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = timeSeries.metrics.series[concept];
    if (!series || series.status === "not_reported") continue;
    const points = frequency === "annual" ? series.annual : series.quarterly;
    dates.push(...points.map((p) => p.periodEnd));
  }
  return dates;
}

function buildSegmentCoverage(metrics: ExtendedMetricsBundle): SegmentCoverage {
  const endMarketWithData = metrics.segments.endMarket.filter(
    (s) => s.status === "reported" && s.quarterly.length + s.annual.length > 0,
  ).length;
  const geographyWithData = metrics.segments.geography.filter(
    (s) => s.status === "reported" && s.quarterly.length + s.annual.length > 0,
  ).length;

  return {
    endMarketSegments: metrics.segments.endMarket.length,
    geographySegments: metrics.segments.geography.length,
    endMarketWithData,
    geographyWithData,
  };
}

function insiderSignalCount(insider: EventStudyResult): number {
  if (insider.status === "insufficient_signal") return insider.signalEventCount;
  return insider.signalEvents.length;
}

export function buildCoverageReport(input: {
  timeSeries: TimeSeriesBundle;
  metrics: ExtendedMetricsBundle;
  valuation?: ValuationBundle;
  insider: EventStudyResult;
}): CoverageReport {
  const warnings: string[] = [];
  const metricsReported = ALL_WHITELISTED_CONCEPTS.filter(
    (c) => input.timeSeries.metrics.series[c]?.status === "reported",
  ).length;

  const quarterlyRange = periodRange(collectPeriodEnds(input.timeSeries, "quarterly"));
  const annualRange = periodRange(collectPeriodEnds(input.timeSeries, "annual"));

  if (!quarterlyRange || quarterlyRange.pointCount < 4) {
    warnings.push("SUSPECT_COVERAGE: fewer than 4 quarterly data points across metrics");
  }

  const segments = buildSegmentCoverage(input.metrics);
  if (segments.endMarketWithData === 0 && segments.geographyWithData === 0) {
    warnings.push("SUSPECT_COVERAGE: no segment breakout data available");
  }

  if (input.metrics.missing.length > 0) {
    warnings.push(`SUSPECT_COVERAGE: ${input.metrics.missing.length} derived metric gaps recorded`);
  }

  if (!input.valuation) {
    warnings.push("SUSPECT_COVERAGE: valuation multiples unavailable (no ticker or price data)");
  }

  if (input.insider.status === "insufficient_signal") {
    warnings.push(
      `insufficient_signal: ${input.insider.signalEventCount} insider signal events (minimum ${input.insider.minimumRequired ?? MINIMUM_SIGNAL_EVENTS})`,
    );
  }

  return {
    cik: input.timeSeries.cik,
    entityName: input.timeSeries.entityName,
    metricsReported,
    metricsTotal: ALL_WHITELISTED_CONCEPTS.length,
    quarterlyRange,
    annualRange,
    segments,
    insiderSignalEventCount: insiderSignalCount(input.insider),
    insiderStatus: input.insider.status,
    valuationAvailable: Boolean(input.valuation),
    warnings,
  };
}
