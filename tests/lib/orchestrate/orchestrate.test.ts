import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractIxbrl } from "@/lib/edgar";
import {
  analyzeCompanyOffline,
  analyzeCompanyQuarterOffline,
  buildCoverageReport,
  detectCrossLayerAnomalies,
  isChartMarkable,
  isValidCik,
  normalizeCik,
  validateMasterContract,
} from "@/lib/orchestrate";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";
import sndkGolden from "../../fixtures/sndk-golden-data.json";
import sndkInsider from "../../fixtures/sndk-insider-transactions.json";

const sndkIxbrl = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10q-ixbrl.htm"),
  "utf8",
);
const sndkIxbrlFacts = extractIxbrl(sndkIxbrl).facts;

type SndkInsiderFixture = {
  cik: string;
  symbol: string;
  transactions: Array<{
    transaction: import("@/lib/edgar").InsiderTransaction;
    filingDate: string;
  }>;
};

const insiderFixture = sndkInsider as SndkInsiderFixture;

function buildTradingDays(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00.000Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function flatQuotes(symbol: string, dates: string[], close: number) {
  return dates.map((date) => ({
    symbol,
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000_000,
  }));
}

describe("Orchestrate chunk", () => {
  it("E2E SNDK offline with stubbed data", async () => {
    const result = await analyzeCompanyQuarterOffline(
      { cik: "0002023554", ticker: "SNDK" },
      {
        companyFacts: sndkCompanyFacts as never,
        explanation: {
          refused: false,
          explanations: [
            { category: "revenue", summary: "Stub explanation", confidence: "high" },
          ],
        },
      },
    );

    expect(result.analysis.financials.sharesOutstanding).toBe(sndkGolden.shares);
    expect(result.analysis.ratios.grossMargin).toBeDefined();
    expect(result.explanation?.explanations.length).toBe(1);
  });

  it("validates CIK format", () => {
    expect(isValidCik("2023554")).toBe(true);
    expect(isValidCik("0002023554")).toBe(true);
    expect(isValidCik("")).toBe(false);
    expect(isValidCik("not-a-cik")).toBe(false);
  });

  it("normalizes CIK to 10 digits", () => {
    expect(normalizeCik("2023554")).toBe("0002023554");
  });

  it("smoke test wireHandlers export", async () => {
    const { wireHandlers } = await import("@/lib/orchestrate");
    const handlers = wireHandlers();
    expect(handlers.edgar).toBeDefined();
    expect(handlers.analyzeQuarter).toBeTypeOf("function");
    expect(handlers.analyzeCompany).toBeTypeOf("function");
  });
});

describe("Chunk 10 master orchestration", () => {
  const priceBars = [
    { date: "2026-05-15", open: 50, high: 51, low: 49, close: 50, volume: 1_000_000 },
    { date: "2026-06-01", open: 52, high: 53, low: 51, close: 52, volume: 1_000_000 },
  ];
  const stockDates = buildTradingDays("2026-05-01", 80);
  const stockPrices = flatQuotes("SNDK", stockDates, 47.8);
  const benchmarkPrices = flatQuotes("SPY", stockDates, 500);

  it("E2E SNDK offline integrates chunks 3/7/8/9 (C10.1–C10.4)", async () => {
    const result = await analyzeCompanyOffline(
      { cik: "0002023554", ticker: "SNDK" },
      {
        companyFacts: sndkCompanyFacts as never,
        ixbrlFacts: sndkIxbrlFacts,
        symbol: "SNDK",
        priceBars,
        insiderTransactions: insiderFixture.transactions,
        stockPrices,
        benchmarkPrices,
      },
    );

    expect(result.timeSeries.metrics.series).toBeDefined();
    expect(result.metrics.cashFlowQuality.freeCashFlow.quarterly.length).toBeGreaterThan(0);
    expect(result.valuation?.enterpriseValue.points.length).toBeGreaterThan(0);
    expect(result.insider.status).toBe("insufficient_signal");
    expect(result.contract.checks.find((c) => c.id === "C10.1")?.passed).toBe(true);
    expect(result.contract.checks.find((c) => c.id === "C10.2")?.passed).toBe(true);
    expect(result.contract.checks.find((c) => c.id === "C10.3")?.passed).toBe(true);
    expect(result.contract.checks.find((c) => c.id === "C10.4")?.passed).toBe(true);
  });

  it("emits chart-markable cross-layer anomalies (C10.5)", async () => {
    const result = await analyzeCompanyOffline(
      { cik: "0002023554", ticker: "SNDK" },
      {
        companyFacts: sndkCompanyFacts as never,
        ixbrlFacts: sndkIxbrlFacts,
        symbol: "SNDK",
        priceBars,
        insiderTransactions: insiderFixture.transactions,
        stockPrices,
        benchmarkPrices,
      },
    );

    expect(result.crossAnomalies.length).toBeGreaterThan(0);
    for (const anomaly of result.crossAnomalies) {
      expect(isChartMarkable(anomaly)).toBe(true);
      expect(anomaly.chartKeys.length).toBeGreaterThan(0);
    }

    const detected = detectCrossLayerAnomalies({
      timeSeries: result.timeSeries,
      metrics: result.metrics,
      valuation: result.valuation,
      insider: result.insider,
    });
    expect(detected.length).toBe(result.crossAnomalies.length);
  });

  it("builds coverage report with insider insufficient_signal warning (C10.7)", async () => {
    const result = await analyzeCompanyOffline(
      { cik: "0002023554", ticker: "SNDK" },
      {
        companyFacts: sndkCompanyFacts as never,
        ixbrlFacts: sndkIxbrlFacts,
        symbol: "SNDK",
        priceBars,
        insiderTransactions: insiderFixture.transactions,
        stockPrices,
        benchmarkPrices,
      },
    );

    expect(result.coverage.metricsReported).toBeGreaterThan(0);
    expect(result.coverage.quarterlyRange?.pointCount).toBeGreaterThan(0);
    expect(result.coverage.segments.endMarketWithData).toBeGreaterThan(0);
    expect(result.coverage.insiderStatus).toBe("insufficient_signal");
    expect(result.coverage.warnings.some((w) => w.includes("insufficient_signal"))).toBe(true);

    const report = buildCoverageReport({
      timeSeries: result.timeSeries,
      metrics: result.metrics,
      valuation: result.valuation,
      insider: result.insider,
    });
    expect(report.valuationAvailable).toBe(true);
  });

  it("validates master contract aggregates chunk checks", async () => {
    const result = await analyzeCompanyOffline(
      { cik: "0002023554", ticker: "SNDK" },
      {
        companyFacts: sndkCompanyFacts as never,
        ixbrlFacts: sndkIxbrlFacts,
        symbol: "SNDK",
        priceBars,
        insiderTransactions: insiderFixture.transactions,
        stockPrices,
        benchmarkPrices,
      },
    );

    const validation = validateMasterContract({
      timeSeriesState: {
        cik: result.cik,
        rawFacts: sndkCompanyFacts as never,
        bundle: result.timeSeries,
        notReported: [],
      },
      metrics: result.metrics,
      valuation: result.valuation,
      insider: result.insider,
      crossAnomalies: result.crossAnomalies,
      explainedAnomalyIds: new Set(result.anomalyExplanations.map((e) => e.anomalyId)),
      coverage: result.coverage,
      ticker: "SNDK",
    });

    expect(validation.checks.length).toBeGreaterThanOrEqual(7);
    expect(validation.timeSeriesValidation?.passed).toBe(true);
    expect(result.completed).toBe(true);
  });
});
