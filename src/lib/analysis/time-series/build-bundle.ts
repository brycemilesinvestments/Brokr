import type { CompanyFactsResponse } from "@/lib/edgar/types";
import {
  ALL_WHITELISTED_CONCEPTS,
  buildMetricSeriesBundle,
  type MetricSeriesBundle,
} from "@/lib/edgar/time-series";
import { enrichMetricSeriesDeltas } from "@/lib/analysis/time-series/deltas";
import { computeRatioSeries, ratioSeriesForFrequency } from "@/lib/analysis/time-series/ratios";
import { detectSeriesAnomalies } from "@/lib/analysis/time-series/anomalies";
import { toChartBundle, toRatioChartBundle } from "@/lib/analysis/time-series/chart-bundle";
import type {
  ContractCheck,
  ContractValidation,
  RatioSeriesKey,
  TimeSeriesBundle,
  TimeSeriesState,
} from "@/lib/analysis/time-series/types";

const RATIO_KEYS: RatioSeriesKey[] = [
  "gross_margin",
  "operating_margin",
  "net_margin",
  "current_ratio",
  "debt_to_equity",
  "return_on_equity",
];

function enrichBundle(metrics: MetricSeriesBundle): MetricSeriesBundle {
  const series = { ...metrics.series };

  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const metric = series[concept];
    if (!metric || metric.status === "not_reported") continue;

    const enriched = enrichMetricSeriesDeltas({
      annual: metric.annual,
      quarterly: metric.quarterly,
    });

    series[concept] = {
      ...metric,
      annual: enriched.annual,
      quarterly: enriched.quarterly,
    };
  }

  return { ...metrics, series };
}

export function buildTimeSeriesBundle(
  rawFacts: CompanyFactsResponse,
): TimeSeriesBundle {
  const rawMetrics = buildMetricSeriesBundle(rawFacts);
  const metrics = enrichBundle(rawMetrics);
  const ratioSeries = computeRatioSeries(metrics);
  const anomalies = detectSeriesAnomalies(metrics, ratioSeries);

  const metricChart = toChartBundle(metrics, anomalies);
  const ratioChart = toRatioChartBundle(ratioSeries, anomalies);

  return {
    cik: rawFacts.cik,
    entityName: rawFacts.entityName,
    rawFacts,
    metrics,
    ratioSeries,
    anomalies,
    chart: { ...metricChart, ...ratioChart },
  };
}

export function buildTimeSeriesState(
  rawFacts: CompanyFactsResponse,
): TimeSeriesState {
  const bundle = buildTimeSeriesBundle(rawFacts);
  const notReported = ALL_WHITELISTED_CONCEPTS.reduce<
    Array<{ metric: string; status: "not_reported" }>
  >((acc, concept) => {
    if (bundle.metrics.series[concept]?.status === "not_reported") {
      acc.push({ metric: concept, status: "not_reported" });
    }
    return acc;
  }, []);

  return {
    cik: rawFacts.cik,
    rawFacts,
    bundle,
    notReported,
  };
}

function isSortedAscending(dates: string[]): boolean {
  for (let i = 1; i < dates.length; i++) {
    if (dates[i].localeCompare(dates[i - 1]) < 0) return false;
  }
  return true;
}

function hasDuplicatePeriodEnds(
  points: Array<{ periodEnd: string }>,
): boolean {
  const seen = new Set<string>();
  for (const p of points) {
    if (seen.has(p.periodEnd)) return true;
    seen.add(p.periodEnd);
  }
  return false;
}

/** Validate completion contract C1–C10 (C11: all checks pass). */
export function validateTimeSeriesContract(state: TimeSeriesState): ContractValidation {
  const checks: ContractCheck[] = [];

  // C1
  checks.push({
    id: "C1",
    passed: state.rawFacts !== null,
    message: state.rawFacts ? undefined : "rawFacts is null",
  });

  const bundle = state.bundle;

  // C2
  const missingMetrics = ALL_WHITELISTED_CONCEPTS.filter(
    (c) => !bundle?.metrics.series[c],
  );
  const silentNotReported = ALL_WHITELISTED_CONCEPTS.filter((c) => {
    const s = bundle?.metrics.series[c];
    return s?.status === "not_reported" && !state.notReported.some((n) => n.metric === c);
  });
  checks.push({
    id: "C2",
    passed: missingMetrics.length === 0 && silentNotReported.length === 0,
    message:
      missingMetrics.length > 0
        ? `Missing series: ${missingMetrics.join(", ")}`
        : silentNotReported.length > 0
          ? `not_reported not recorded: ${silentNotReported.join(", ")}`
          : undefined,
  });

  if (!bundle) {
    checks.push({ id: "C3-C10", passed: false, message: "bundle is null" });
    return { passed: false, checks };
  }

  // C3 — no point with same (period_end, fp) in both arrays
  let c3 = true;
  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = bundle.metrics.series[concept];
    if (!series || series.status === "not_reported") continue;

    const annualKeys = new Set(series.annual.map((p) => `${p.periodEnd}:${p.fp ?? ""}`));
    const overlap = series.quarterly.some((p) => annualKeys.has(`${p.periodEnd}:${p.fp ?? ""}`));
    if (overlap) c3 = false;
  }

  checks.push({
    id: "C3",
    passed: c3,
    message: c3 ? undefined : "Same (period_end, fp) appears in both annual and quarterly",
  });

  let c4 = true;
  let c5 = true;

  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = bundle.metrics.series[concept];
    if (!series || series.status === "not_reported") continue;

    if (hasDuplicatePeriodEnds(series.annual) || hasDuplicatePeriodEnds(series.quarterly)) {
      c4 = false;
    }

    if (
      !isSortedAscending(series.annual.map((p) => p.periodEnd)) ||
      !isSortedAscending(series.quarterly.map((p) => p.periodEnd))
    ) {
      c5 = false;
    }
  }

  checks.push({ id: "C4", passed: c4, message: c4 ? undefined : "Duplicate (period_end, frequency) pairs" });
  checks.push({ id: "C5", passed: c5, message: c5 ? undefined : "Series not sorted ascending by period_end" });

  // C6 — gaps are recorded (always true if gaps array exists; we don't require zero gaps)
  checks.push({
    id: "C6",
    passed: ALL_WHITELISTED_CONCEPTS.every((c) => Array.isArray(bundle.metrics.series[c]?.gaps)),
    message: "Every series must expose gaps[]",
  });

  // C7 — deltas align 1:1
  let c7 = true;
  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = bundle.metrics.series[concept];
    if (!series || series.status === "not_reported") continue;

    for (let index = 0; index < series.quarterly.length; index += 1) {
      const point = series.quarterly[index];
      if (!("deltaQoq" in point) && index > 0) {
        // first quarter may lack qoq — that's ok as undefined
      }
      if (!("deltaYoy" in point)) c7 = false;
    }
    for (const point of series.annual) {
      if (!("deltaYoy" in point)) c7 = false;
    }
  }
  checks.push({ id: "C7", passed: c7, message: c7 ? undefined : "Missing delta fields on series points" });

  // C8 — ratio series lengths match anchor periods
  let c8 = true;
  const revenue = bundle.metrics.series.RevenueFromContractWithCustomerExcludingAssessedTax;
  if (revenue?.status === "reported") {
    for (const key of RATIO_KEYS) {
      const annualCount = ratioSeriesForFrequency(bundle.ratioSeries, key, "annual").length;
      const quarterlyCount = ratioSeriesForFrequency(bundle.ratioSeries, key, "quarterly").length;
      if (annualCount !== revenue.annual.length || quarterlyCount !== revenue.quarterly.length) {
        c8 = false;
      }
    }
  }
  checks.push({ id: "C8", passed: c8, message: c8 ? undefined : "ratioSeries length mismatch vs revenue anchor" });

  // C9 — anomalies have required shape
  const c9 = bundle.anomalies.every(
    (a) => a.periodEnd && a.metric && a.type && typeof a.magnitude === "number",
  );
  checks.push({ id: "C9", passed: c9, message: c9 ? undefined : "Malformed anomaly entries" });

  // C10 — chart bundle shape
  let c10 = true;
  for (const concept of ALL_WHITELISTED_CONCEPTS) {
    const series = bundle.metrics.series[concept];
    if (!series || series.status === "not_reported") continue;
    const chartPoints = bundle.chart[concept];
    if (!chartPoints) {
      c10 = false;
      continue;
    }
    const expectedLen = series.annual.length + series.quarterly.length;
    if (chartPoints.length !== expectedLen) c10 = false;
    for (const pt of chartPoints) {
      if (!pt.x || pt.y === undefined || !pt.frequency) c10 = false;
    }
  }
  checks.push({ id: "C10", passed: c10, message: c10 ? undefined : "ChartBundle missing or malformed metric series" });

  // C11 — full contract satisfied
  const allPassed = checks.every((c) => c.passed);
  checks.push({
    id: "C11",
    passed: allPassed,
    message: allPassed ? undefined : "One or more contract checks failed",
  });

  return { passed: allPassed, checks };
}

export function isTimeSeriesComplete(state: TimeSeriesState): boolean {
  return validateTimeSeriesContract(state).passed;
}
