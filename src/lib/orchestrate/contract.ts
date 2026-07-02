import {
  isTimeSeriesComplete,
  validateTimeSeriesContract,
  type ContractValidation,
  type TimeSeriesState,
} from "@/lib/analysis";
import type { EventStudyResult } from "@/lib/insider";
import type { ExtendedMetricsBundle } from "@/lib/metrics";
import type { ValuationBundle } from "@/lib/valuation";
import type {
  CrossLayerAnomaly,
  MasterContractCheck,
  MasterContractValidation,
} from "@/lib/orchestrate/types";

function checkExtendedMetrics(metrics: ExtendedMetricsBundle): MasterContractCheck {
  const seriesList = [
    metrics.cashFlowQuality.freeCashFlow,
    metrics.cashFlowQuality.fcfMargin,
    metrics.cashFlowQuality.capexIntensity,
    metrics.workingCapital.dso,
    metrics.workingCapital.dio,
    metrics.workingCapital.dpo,
    metrics.workingCapital.cashConversionCycle,
    metrics.dilution.sbcPctRevenue,
    metrics.dilution.shareCountTrend,
    metrics.dilution.netIssuance,
  ];

  const hasAllSeries = seriesList.every(
    (s) => s.quarterly.length > 0 || s.annual.length > 0 || s.status === "not_reported",
  );
  const hasChart = Object.keys(metrics.chart).length > 0;
  const passed = hasAllSeries && hasChart && metrics.backlog.status !== undefined;

  return {
    id: "C10.2",
    passed,
    message: passed ? undefined : "Extended metrics bundle incomplete or missing chart output",
  };
}

function checkValuation(valuation: ValuationBundle | undefined, ticker?: string): MasterContractCheck {
  if (!ticker) {
    return {
      id: "C10.3",
      passed: true,
      message: "Skipped — no ticker provided",
    };
  }

  if (!valuation) {
    return {
      id: "C10.3",
      passed: false,
      message: "Valuation bundle missing despite ticker",
    };
  }

  const hasEv = valuation.enterpriseValue.points.length > 0;
  const hasMultiples =
    valuation.multiples.pe.points.length > 0 ||
    valuation.multiples.evSales.points.length > 0;
  const hasChart = Object.keys(valuation.chart).length > 0;
  const passed = hasEv && hasMultiples && hasChart;

  return {
    id: "C10.3",
    passed,
    message: passed ? undefined : "Valuation EV/multiples/chart incomplete",
  };
}

function checkInsider(insider: EventStudyResult): MasterContractCheck {
  const passed =
    insider.status === "complete" ||
    insider.status === "insufficient_signal";

  return {
    id: "C10.4",
    passed,
    message: passed ? undefined : "Insider event study produced invalid result",
  };
}

function checkCrossAnomalies(anomalies: CrossLayerAnomaly[]): MasterContractCheck {
  const passed = anomalies.every((a) => a.date && a.chartKeys.length > 0);
  return {
    id: "C10.5",
    passed,
    message: passed ? undefined : "Cross-layer anomalies missing chart-markable fields",
  };
}

function checkExplanations(
  anomalies: CrossLayerAnomaly[],
  explainedIds: Set<string>,
): MasterContractCheck {
  if (anomalies.length === 0) {
    return { id: "C10.6", passed: true, message: "No anomalies to explain" };
  }

  const passed = anomalies.every((a) => explainedIds.has(a.id));
  return {
    id: "C10.6",
    passed,
    message: passed
      ? undefined
      : `${anomalies.length - explainedIds.size} flagged anomalies lack AI explanations`,
  };
}

function checkCoverage(coverage: { warnings: string[] } | undefined): MasterContractCheck {
  return {
    id: "C10.7",
    passed: Boolean(coverage && coverage.warnings !== undefined),
    message: coverage ? undefined : "Coverage report missing",
  };
}

export function validateMasterContract(input: {
  timeSeriesState: TimeSeriesState;
  metrics: ExtendedMetricsBundle;
  valuation?: ValuationBundle;
  insider: EventStudyResult;
  crossAnomalies: CrossLayerAnomaly[];
  explainedAnomalyIds: Set<string>;
  coverage?: { warnings: string[] };
  ticker?: string;
}): MasterContractValidation {
  const timeSeriesValidation = validateTimeSeriesContract(input.timeSeriesState);

  const checks: MasterContractCheck[] = [
    {
      id: "C10.1",
      passed: isTimeSeriesComplete(input.timeSeriesState),
      message: isTimeSeriesComplete(input.timeSeriesState)
        ? undefined
        : "Fundamentals time series contract not satisfied",
    },
    checkExtendedMetrics(input.metrics),
    checkValuation(input.valuation, input.ticker),
    checkInsider(input.insider),
    checkCrossAnomalies(input.crossAnomalies),
    checkExplanations(input.crossAnomalies, input.explainedAnomalyIds),
    checkCoverage(input.coverage),
  ];

  const passed = checks.every((c) => c.passed) && timeSeriesValidation.passed;

  return {
    passed,
    checks,
    timeSeriesValidation,
  };
}

export function collectUnsatisfied(validation: MasterContractValidation): string[] {
  const unsatisfied: string[] = [];

  for (const check of validation.checks) {
    if (!check.passed) {
      unsatisfied.push(`${check.id}: ${check.message ?? "failed"}`);
    }
  }

  if (validation.timeSeriesValidation) {
    for (const check of validation.timeSeriesValidation.checks) {
      if (!check.passed) {
        unsatisfied.push(`Chunk3-${check.id}: ${check.message ?? "failed"}`);
      }
    }
  }

  return unsatisfied;
}

export type { ContractValidation };
