import { describe, expect, it } from "vitest";
import type { InsiderTransaction } from "@/lib/edgar";
import type { MarketQuote } from "@/lib/market";
import {
  assertNoLookAheadAtT0,
  benchmarkExpectedReturnDates,
  buildInsiderEvent,
  classifyTransaction,
  computeAbnormalReturn,
  computeAggregations,
  computeBenchmarkReturn,
  computeSignalDecay,
  detectClusters,
  expectedReturnPriceDates,
  MINIMUM_SIGNAL_EVENTS,
  parseTransactionCode,
  runEventStudy,
  resolveBenchmarkSymbol,
  validateFilingDateAlignment,
  DEFAULT_EVENT_WINDOWS,
} from "@/lib/insider";
import sndkInsider from "../../fixtures/sndk-insider-transactions.json";

type SndkInsiderFixture = {
  cik: string;
  symbol: string;
  expectedSignalCount: number;
  transactions: Array<{
    transaction: InsiderTransaction;
    filingDate: string;
  }>;
};

const sndkFixture = sndkInsider as SndkInsiderFixture;

function buildTradingDays(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00.000Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function quotesFromCloses(
  symbol: string,
  dates: string[],
  closes: number[],
): MarketQuote[] {
  return dates.map((date, index) => ({
    symbol,
    date,
    open: closes[index],
    high: closes[index],
    low: closes[index],
    close: closes[index],
    volume: 1_000_000,
  }));
}

describe("Insider chunk", () => {
  describe("classification (C9.1)", () => {
    it("classifies F-InKind as noise and P as signal on SNDK fixtures", () => {
      for (const row of sndkFixture.transactions) {
        const { code, classification } = classifyTransaction(row.transaction);
        expect(code).toBeTruthy();

        if (row.transaction.transactionType?.startsWith("F")) {
          expect(classification).toBe("noise");
        }
        if (row.transaction.transactionType?.startsWith("A")) {
          expect(classification).toBe("noise");
        }
        if (row.transaction.transactionType?.startsWith("G")) {
          expect(classification).toBe("noise");
        }
        if (row.transaction.transactionType?.startsWith("C")) {
          expect(classification).toBe("noise");
        }
        if (row.transaction.transactionType?.startsWith("J")) {
          expect(classification).toBe("noise");
        }
        if (row.transaction.transactionType?.startsWith("S")) {
          expect(classification).toBe("signal");
        }
      }

      const purchase: InsiderTransaction = {
        reportingOwner: "Buyer One",
        transactionDate: "2025-01-10",
        transactionType: "P-Purchase",
        acquiredOrDisposed: "A",
      };
      expect(classifyTransaction(purchase).classification).toBe("signal");
      expect(parseTransactionCode("F-InKind")).toBe("F");
      expect(parseTransactionCode("P-Purchase")).toBe("P");
    });
  });

  describe("filing-date discipline (C9.2)", () => {
    it("rejects transaction-date alignment when filing date differs", () => {
      const result = validateFilingDateAlignment(
        "2025-02-18",
        "2025-02-14",
        "2025-02-14",
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toMatch(/transaction-date alignment rejected/i);
      }

      const valid = validateFilingDateAlignment(
        "2025-02-18",
        "2025-02-14",
        "2025-02-18",
      );
      expect(valid.valid).toBe(true);
    });

    it("builds events with filing date as t=0", () => {
      const row = sndkFixture.transactions[0];
      const event = buildInsiderEvent(row.transaction, row.filingDate);
      expect(event?.eventDate).toBe(row.filingDate);
      expect(event?.eventDate).not.toBe(row.transaction.transactionDate);
    });
  });

  describe("abnormal returns (C9.4)", () => {
    it("yields ~0 CAR when stock and benchmark move identically (zero-edge)", () => {
      const dates = buildTradingDays("2025-01-01", 80);
      const closes = dates.map((_, index) => 100 + index * 0.5);
      const stock = quotesFromCloses("TEST", dates, closes);
      const benchmark = quotesFromCloses("SPY", dates, closes);

      const result = computeAbnormalReturn(
        stock,
        benchmark,
        "2025-02-18",
        DEFAULT_EVENT_WINDOWS[0],
      );

      expect(result).not.toBeNull();
      expect(result!.abnormalReturn).toBeCloseTo(0, 10);
      expect(result!.cumulativeAbnormalReturn).toBeCloseTo(0, 10);
    });
  });

  describe("insufficient signal (C9.7)", () => {
    it("returns insufficient_signal for SNDK with actual signal count", () => {
      const dates = buildTradingDays("2025-01-01", 200);
      const closes = dates.map((_, index) => 100 + index * 0.1);
      const stock = quotesFromCloses("SNDK", dates, closes);
      const benchmark = quotesFromCloses("SPY", dates, closes.map((v) => v * 0.98));

      const result = runEventStudy({
        cik: sndkFixture.cik,
        symbol: sndkFixture.symbol,
        transactions: sndkFixture.transactions,
        stockPrices: stock,
        benchmarkPrices: benchmark,
      });

      expect(result.status).toBe("insufficient_signal");
      if (result.status === "insufficient_signal") {
        expect(result.signalEventCount).toBe(sndkFixture.expectedSignalCount);
        expect(result.signalEventCount).toBeLessThan(MINIMUM_SIGNAL_EVENTS);
        expect(result.minimumRequired).toBe(MINIMUM_SIGNAL_EVENTS);
        expect(result.message).toMatch(/insufficient|no actionable/i);
      }
    });
  });

  describe("cluster detection (C9.6)", () => {
    it("flags a cluster when 3 insiders buy within 30 days", () => {
      const purchases = [
        buildInsiderEvent(
          {
            reportingOwner: "Insider A",
            transactionDate: "2025-03-01",
            transactionType: "P-Purchase",
            acquiredOrDisposed: "A",
          },
          "2025-03-04",
        ),
        buildInsiderEvent(
          {
            reportingOwner: "Insider B",
            transactionDate: "2025-03-10",
            transactionType: "P-Purchase",
            acquiredOrDisposed: "A",
          },
          "2025-03-12",
        ),
        buildInsiderEvent(
          {
            reportingOwner: "Insider C",
            transactionDate: "2025-03-20",
            transactionType: "P-Purchase",
            acquiredOrDisposed: "A",
          },
          "2025-03-22",
        ),
      ].filter((event): event is NonNullable<typeof event> => event != null);

      const clusters = detectClusters(purchases);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].events.length).toBeGreaterThanOrEqual(3);
      expect(new Set(clusters[0].events.map((e) => e.transaction.reportingOwner)).size).toBe(3);
    });
  });

  describe("event windows and aggregation (C9.3, C9.5)", () => {
    it("computes CAR over [+1,+5], [+1,+20], [+1,+60] and aggregates by signal type", () => {
      const dates = buildTradingDays("2025-01-01", 200);
      const stockCloses = dates.map((_, index) => 100 + index * 0.2);
      const benchmarkCloses = dates.map((_, index) => 100 + index * 0.1);
      const stock = quotesFromCloses("TEST", dates, stockCloses);
      const benchmark = quotesFromCloses("SPY", dates, benchmarkCloses);

      const owners = ["A", "B", "C", "D", "E"];
      const transactions = owners.map((owner, index) => ({
        transaction: {
          reportingOwner: `Insider ${owner}`,
          transactionDate: `2025-02-${String(10 + index).padStart(2, "0")}`,
          transactionType: "P-Purchase",
          acquiredOrDisposed: "A" as const,
        },
        filingDate: `2025-02-${String(12 + index).padStart(2, "0")}`,
      }));

      const result = runEventStudy({
        cik: "0000000001",
        symbol: "TEST",
        transactions,
        stockPrices: stock,
        benchmarkPrices: benchmark,
      });

      expect(result.status).toBe("complete");
      if (result.status !== "complete") return;

      expect(result.abnormalReturns).toHaveLength(owners.length * DEFAULT_EVENT_WINDOWS.length);
      expect(result.aggregations.length).toBeGreaterThan(0);
      expect(result.signalDecay.length).toBeGreaterThan(0);

      for (const window of DEFAULT_EVENT_WINDOWS) {
        expect(
          result.abnormalReturns.some((item) => item.window.label === window.label),
        ).toBe(true);
      }

      const aggregations = computeAggregations(result.signalEvents, result.abnormalReturns);
      const decay = computeSignalDecay(aggregations);
      expect(decay[0].shortCar).toBeDefined();
      expect(decay[0].mediumCar).toBeDefined();
      expect(decay[0].longCar).toBeDefined();
    });

    it("resolves sector benchmark symbols and benchmark window returns", () => {
      expect(resolveBenchmarkSymbol(undefined, "3572")).toBe("XLK");
      expect(resolveBenchmarkSymbol("Technology")).toBe("XLK");
      expect(resolveBenchmarkSymbol()).toBe("SPY");

      const dates = buildTradingDays("2025-01-01", 80);
      const benchmark = quotesFromCloses("SPY", dates, dates.map((_, i) => 100 + i));
      const windowReturn = computeBenchmarkReturn(benchmark, "2025-02-18", DEFAULT_EVENT_WINDOWS[0]);
      expect(windowReturn).not.toBeNull();
      expect(windowReturn!).toBeGreaterThan(0);
    });
  });

  describe("look-ahead guard (C9.8)", () => {
    it("does not reference prices beyond t+window when computing expected return dates", () => {
      const dates = buildTradingDays("2025-01-01", 100);
      const filingDate = "2025-02-18";
      const window = DEFAULT_EVENT_WINDOWS[0];

      const usedDates = expectedReturnPriceDates(filingDate, window, dates);
      expect(
        assertNoLookAheadAtT0(usedDates, filingDate, window, dates),
      ).toBe(true);

      const futureLeak = [...usedDates, dates[dates.length - 1]];
      expect(
        assertNoLookAheadAtT0(futureLeak, filingDate, window, dates),
      ).toBe(false);

      const benchmarkDates = benchmarkExpectedReturnDates(
        quotesFromCloses("SPY", dates, dates.map((_, i) => 400 + i)),
        filingDate,
        window,
      );
      expect(
        assertNoLookAheadAtT0(benchmarkDates, filingDate, window, dates),
      ).toBe(true);
    });
  });
});
