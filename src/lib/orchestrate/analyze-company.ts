import {
  buildTimeSeriesState,
  type TimeSeriesBundle,
} from "@/lib/analysis";
import type { AiClient } from "@/lib/ai";
import { explainFinancials } from "@/lib/ai";
import type { CompanyFactsResponse, XbrlFact } from "@/lib/edgar";
import { buildExtendedMetricsBundle } from "@/lib/metrics";
import type { EdgarClient } from "@/lib/edgar";
import type { MarketClient, MarketQuote, NormalizedBar } from "@/lib/market";
import { parseYahooChartResponse } from "@/lib/market";
import {
  resolveBenchmarkSymbol,
  runEventStudy,
  type EventStudyTransaction,
} from "@/lib/insider";
import { buildValuationBundle } from "@/lib/valuation";
import { collectUnsatisfied, validateMasterContract } from "@/lib/orchestrate/contract";
import { buildCoverageReport } from "@/lib/orchestrate/coverage-report";
import { resolveMetricPolarities } from "@/lib/orchestrate/resolve-metric-polarities";
import {
  buildAnomalyExcerpt,
  detectCrossLayerAnomalies,
} from "@/lib/orchestrate/cross-anomalies";
import { MINIMUM_SIGNAL_EVENTS } from "@/lib/insider";
import type {
  AnalyzeCompanyInput,
  AnomalyExplanation,
  CompanyAnalysisOutput,
  MasterOrchestrationConfig,
} from "@/lib/orchestrate/types";
import { parseMasterConfigFromEnv } from "@/lib/orchestrate/types";

const EXPLAIN_COST_USD = 0.01;

export type AnalyzeCompanyDeps = {
  edgar: EdgarClient;
  market?: MarketClient;
  ai?: AiClient;
  ixbrlFacts?: XbrlFact[];
  fetchInsiderTransactions?: (cik: string) => Promise<EventStudyTransaction[]>;
  config?: MasterOrchestrationConfig;
  now?: () => number;
};

export type AnalyzeCompanyOfflineFixtures = {
  companyFacts: CompanyFactsResponse;
  ixbrlFacts?: XbrlFact[];
  insiderTransactions?: EventStudyTransaction[];
  stockPrices?: MarketQuote[];
  benchmarkPrices?: MarketQuote[];
  priceBars?: NormalizedBar[];
  symbol?: string;
  explanation?: import("@/lib/ai").ExplainResponse;
};

function quotesToBars(quotes: MarketQuote[]): NormalizedBar[] {
  return quotes.map((q) => ({
    date: q.date,
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume,
  }));
}

function buildInsufficientInsider(cik: string, count: number) {
  return {
    status: "insufficient_signal" as const,
    cik,
    signalEventCount: count,
    minimumRequired: MINIMUM_SIGNAL_EVENTS,
    message:
      count === 0
        ? "no actionable insider signal; newly spun-off, insufficient history"
        : `insufficient signal: ${count} signal events (minimum ${MINIMUM_SIGNAL_EVENTS})`,
  };
}

type BuiltLayers = {
  timeSeries: TimeSeriesBundle;
  metrics: ReturnType<typeof buildExtendedMetricsBundle>;
  valuation?: ReturnType<typeof buildValuationBundle>;
  insider: ReturnType<typeof runEventStudy>;
};

function buildLayersFromFacts(input: {
  companyFacts: CompanyFactsResponse;
  ixbrlFacts?: XbrlFact[];
  ticker?: string;
  symbol?: string;
  priceBars?: NormalizedBar[];
  insiderTransactions?: EventStudyTransaction[];
  stockPrices?: MarketQuote[];
  benchmarkPrices?: MarketQuote[];
}): BuiltLayers {
  const state = buildTimeSeriesState(input.companyFacts);
  if (!state.bundle) {
    throw new Error("Failed to build time series bundle");
  }

  const timeSeries = state.bundle;
  const metrics = buildExtendedMetricsBundle(
    timeSeries,
    input.companyFacts,
    input.ixbrlFacts ?? [],
  );

  const symbol = input.symbol ?? input.ticker;
  let valuation: ReturnType<typeof buildValuationBundle> | undefined;
  if (symbol && input.priceBars && input.priceBars.length > 0) {
    valuation = buildValuationBundle({
      cik: timeSeries.cik,
      symbol,
      prices: input.priceBars,
      timeSeries,
      rawFacts: input.companyFacts,
      metrics,
    });
  }

  let insider: ReturnType<typeof runEventStudy>;
  if (
    input.insiderTransactions &&
    input.stockPrices &&
    input.benchmarkPrices &&
    symbol
  ) {
    insider = runEventStudy({
      cik: timeSeries.cik,
      symbol,
      transactions: input.insiderTransactions,
      stockPrices: input.stockPrices,
      benchmarkPrices: input.benchmarkPrices,
    });
  } else if (input.insiderTransactions) {
    insider = runEventStudy({
      cik: timeSeries.cik,
      symbol: symbol ?? "UNKNOWN",
      transactions: input.insiderTransactions,
      stockPrices: input.stockPrices ?? [],
      benchmarkPrices: input.benchmarkPrices ?? [],
    });
  } else {
    insider = buildInsufficientInsider(timeSeries.cik, 0);
  }

  return { timeSeries, metrics, valuation, insider };
}

async function explainAnomaliesInLoop(input: {
  anomalies: ReturnType<typeof detectCrossLayerAnomalies>;
  timeSeries: TimeSeriesBundle;
  ai?: AiClient;
  config: MasterOrchestrationConfig;
  prefilled?: AnomalyExplanation[];
}): Promise<{
  explanations: AnomalyExplanation[];
  costUsd: number;
  iterations: number;
  terminatedReason: CompanyAnalysisOutput["terminatedReason"];
}> {
  const explanations: AnomalyExplanation[] = [...(input.prefilled ?? [])];
  const explainedIds = new Set(explanations.map((e) => e.anomalyId));
  let costUsd = 0;
  let iterations = 0;

  if (!input.ai || input.anomalies.length === 0) {
    return { explanations, costUsd, iterations, terminatedReason: "complete" };
  }

  const pending = input.anomalies.filter((anomaly) => !explainedIds.has(anomaly.id));

  while (pending.length > 0) {
    if (iterations >= input.config.maxIterations) {
      return { explanations, costUsd, iterations, terminatedReason: "max_iterations" };
    }
    if (costUsd >= input.config.maxCostUsd) {
      return { explanations, costUsd, iterations, terminatedReason: "budget_exceeded" };
    }

    const remainingIterations = input.config.maxIterations - iterations;
    const remainingBudgetSlots = Math.floor(
      (input.config.maxCostUsd - costUsd) / EXPLAIN_COST_USD,
    );
    if (remainingBudgetSlots <= 0) {
      return { explanations, costUsd, iterations, terminatedReason: "budget_exceeded" };
    }

    const batchSize = Math.min(pending.length, remainingIterations, remainingBudgetSlots);
    const batch = pending.splice(0, batchSize);

    const batchResults = await Promise.all(
      batch.map(async (anomaly) => {
        const excerpt = buildAnomalyExcerpt(anomaly, input.timeSeries);
        const explanation = await explainFinancials(input.ai!, {
          entityName: input.timeSeries.entityName,
          cik: input.timeSeries.cik,
          metrics: {
            anomalyType: anomaly.type,
            magnitude: anomaly.magnitude,
            periodEnd: anomaly.periodEnd ?? anomaly.date,
          },
          context: excerpt,
        });
        return { anomalyId: anomaly.id, excerpt, explanation };
      }),
    );

    iterations += batch.length;
    costUsd += batch.length * EXPLAIN_COST_USD;
    for (const result of batchResults) {
      explanations.push(result);
      explainedIds.add(result.anomalyId);
    }
  }

  return { explanations, costUsd, iterations, terminatedReason: "complete" };
}

function finalizeOutput(input: {
  cik: string;
  ticker?: string;
  layers: BuiltLayers;
  crossAnomalies: ReturnType<typeof detectCrossLayerAnomalies>;
  anomalyExplanations: AnomalyExplanation[];
  metricPolarities: CompanyAnalysisOutput["metricPolarities"];
  iterations: number;
  costUsd: number;
  terminatedReason: CompanyAnalysisOutput["terminatedReason"];
  aiAvailable: boolean;
}): CompanyAnalysisOutput {
  const timeSeriesState = buildTimeSeriesState(input.layers.timeSeries.rawFacts);
  const coverage = buildCoverageReport({
    timeSeries: input.layers.timeSeries,
    metrics: input.layers.metrics,
    valuation: input.layers.valuation,
    insider: input.layers.insider,
  });

  const explainedIds = new Set(input.anomalyExplanations.map((e) => e.anomalyId));
  const contract = validateMasterContract({
    timeSeriesState,
    metrics: input.layers.metrics,
    valuation: input.layers.valuation,
    insider: input.layers.insider,
    crossAnomalies: input.crossAnomalies,
    explainedAnomalyIds: explainedIds,
    coverage,
    ticker: input.ticker,
  });

  if (input.aiAvailable && input.crossAnomalies.length > 0) {
    const explainCheck = contract.checks.find((c) => c.id === "C10.6");
    if (explainCheck) {
      const allExplained = input.crossAnomalies.every((a) => explainedIds.has(a.id));
      explainCheck.passed =
        allExplained ||
        input.terminatedReason === "budget_exceeded" ||
        input.terminatedReason === "max_iterations";
      if (!explainCheck.passed) {
        explainCheck.message = "Flagged anomalies lack AI explanations";
      }
    }
    contract.passed = contract.checks.every((c) => c.passed) && (contract.timeSeriesValidation?.passed ?? true);
  } else {
    const explainCheck = contract.checks.find((c) => c.id === "C10.6");
    if (explainCheck) {
      explainCheck.passed = true;
      explainCheck.message = "Skipped — no AI client or no anomalies";
    }
    contract.passed = contract.checks.every((c) => c.passed) && (contract.timeSeriesValidation?.passed ?? true);
  }

  const unsatisfied = collectUnsatisfied(contract);
  const completed =
    contract.passed &&
    input.terminatedReason === "complete" &&
    unsatisfied.length === 0;

  return {
    cik: input.cik,
    ticker: input.ticker,
    timeSeries: input.layers.timeSeries,
    metrics: input.layers.metrics,
    valuation: input.layers.valuation,
    insider: input.layers.insider,
    crossAnomalies: input.crossAnomalies,
    anomalyExplanations: input.anomalyExplanations,
    metricPolarities: input.metricPolarities,
    coverage,
    contract,
    completed,
    terminatedReason: completed ? "complete" : input.terminatedReason === "complete" ? "partial" : input.terminatedReason,
    unsatisfied,
    iterations: input.iterations,
    costUsd: input.costUsd,
  };
}

export async function analyzeCompany(
  input: AnalyzeCompanyInput,
  deps: AnalyzeCompanyDeps,
): Promise<CompanyAnalysisOutput> {
  const config = deps.config ?? parseMasterConfigFromEnv();
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const period2 = now();
  const period1 = period2 - 365 * 24 * 60 * 60;

  const companyFacts = await deps.edgar.getCompanyFacts(input.cik);
  let priceBars: NormalizedBar[] | undefined;
  let stockPrices: MarketQuote[] | undefined;
  let benchmarkPrices: MarketQuote[] | undefined;

  if (deps.market && input.ticker) {
    const history = await deps.market.getHistory(input.ticker, period1, period2);
    stockPrices = history.quotes;
    priceBars = quotesToBars(history.quotes);

    const benchmarkSymbol = resolveBenchmarkSymbol();
    const benchmarkHistory = await deps.market.getHistory(benchmarkSymbol, period1, period2);
    benchmarkPrices = benchmarkHistory.quotes;
  }

  let insiderTransactions: EventStudyTransaction[] | undefined;
  if (deps.fetchInsiderTransactions) {
    insiderTransactions = await deps.fetchInsiderTransactions(input.cik);
  }

  const layers = buildLayersFromFacts({
    companyFacts: companyFacts as CompanyFactsResponse,
    ixbrlFacts: deps.ixbrlFacts,
    ticker: input.ticker,
    priceBars,
    insiderTransactions,
    stockPrices,
    benchmarkPrices,
  });

  const crossAnomalies = detectCrossLayerAnomalies({
    timeSeries: layers.timeSeries,
    metrics: layers.metrics,
    valuation: layers.valuation,
    insider: layers.insider,
  });

  const [explainResult, polarityResult] = await Promise.all([
    explainAnomaliesInLoop({
      anomalies: crossAnomalies,
      timeSeries: layers.timeSeries,
      ai: deps.ai,
      config,
    }),
    resolveMetricPolarities(
      [layers.timeSeries.chart, layers.metrics.chart, layers.valuation?.chart ?? {}],
      deps.ai,
    ),
  ]);

  return finalizeOutput({
    cik: input.cik,
    ticker: input.ticker,
    layers,
    crossAnomalies,
    anomalyExplanations: explainResult.explanations,
    metricPolarities: polarityResult.polarities,
    iterations: explainResult.iterations,
    costUsd: explainResult.costUsd + polarityResult.costUsd,
    terminatedReason: explainResult.terminatedReason,
    aiAvailable: Boolean(deps.ai),
  });
}

export async function analyzeCompanyOffline(
  input: AnalyzeCompanyInput,
  fixtures: AnalyzeCompanyOfflineFixtures,
): Promise<CompanyAnalysisOutput> {
  const config = parseMasterConfigFromEnv({ MAX_ITERATIONS: "20", MAX_COST: "0" });

  let priceBars = fixtures.priceBars;
  if (!priceBars && fixtures.stockPrices) {
    priceBars = quotesToBars(fixtures.stockPrices);
  }

  const layers = buildLayersFromFacts({
    companyFacts: fixtures.companyFacts,
    ixbrlFacts: fixtures.ixbrlFacts,
    ticker: input.ticker,
    symbol: fixtures.symbol ?? input.ticker,
    priceBars,
    insiderTransactions: fixtures.insiderTransactions,
    stockPrices: fixtures.stockPrices,
    benchmarkPrices: fixtures.benchmarkPrices,
  });

  const crossAnomalies = detectCrossLayerAnomalies({
    timeSeries: layers.timeSeries,
    metrics: layers.metrics,
    valuation: layers.valuation,
    insider: layers.insider,
  });

  const prefilled: AnomalyExplanation[] = [];
  if (fixtures.explanation && crossAnomalies.length > 0) {
    prefilled.push({
      anomalyId: crossAnomalies[0].id,
      excerpt: buildAnomalyExcerpt(crossAnomalies[0], layers.timeSeries),
      explanation: fixtures.explanation,
    });
  }

  const polarityResult = await resolveMetricPolarities(
    [layers.timeSeries.chart, layers.metrics.chart, layers.valuation?.chart ?? {}],
  );

  return finalizeOutput({
    cik: input.cik,
    ticker: input.ticker,
    layers,
    crossAnomalies,
    anomalyExplanations: prefilled,
    metricPolarities: polarityResult.polarities,
    iterations: 0,
    costUsd: polarityResult.costUsd,
    terminatedReason: "complete",
    aiAvailable: Boolean(fixtures.explanation),
  });
}

function priceBarsFromYahooFixture(
  json: Parameters<typeof parseYahooChartResponse>[0],
  symbol: string,
): NormalizedBar[] {
  const { bars } = parseYahooChartResponse(json, symbol);
  return bars;
}
