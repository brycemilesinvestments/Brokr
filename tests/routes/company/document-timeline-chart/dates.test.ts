import { describe, expect, it } from "vitest";
import { buildStockHistoryRange } from "@/routes/company/[cik]/features/filings/views/timeline-view/filings-timeline/document-timeline-chart/lib/build-stock-history-range";
import { snapToTradingDay } from "@/routes/company/[cik]/features/filings/views/timeline-view/filings-timeline/document-timeline-chart/utils/snap-to-trading-day";

const QUOTES = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-06-01", "2024-12-31"];

describe("snapToTradingDay", () => {
  it("snaps weekend and holiday dates to the next session", () => {
    expect(snapToTradingDay("2024-01-01", QUOTES)).toBe("2024-01-02");
    expect(snapToTradingDay("2024-01-03", QUOTES)).toBe("2024-01-03");
  });

  it("snaps to the previous session when no later session exists", () => {
    expect(snapToTradingDay("2025-01-01", QUOTES)).toBe("2024-12-31");
  });

  it("returns null instead of clamping far-predating events to the first session", () => {
    expect(snapToTradingDay("2020-01-01", QUOTES)).toBeNull();
  });

  it("returns null instead of clamping far-future events to the last session", () => {
    expect(snapToTradingDay("2030-01-01", QUOTES)).toBeNull();
  });
});

describe("buildStockHistoryRange", () => {
  it("covers filing timeline dates and macro observation dates with impact tail buffer", () => {
    const filings = [
      {
        timelineDate: "2023-06-30",
      },
    ] as Parameters<typeof buildStockHistoryRange>[0];
    const fredEvents = [
      {
        observationDate: "2024-03-01",
      },
    ] as Parameters<typeof buildStockHistoryRange>[1];

    const { period1, period2 } = buildStockHistoryRange(filings, fredEvents);

    expect(period1).toBeLessThan(Date.parse("2023-06-30T00:00:00Z") / 1000);
    expect(period2).toBeGreaterThan(Date.parse("2024-03-01T00:00:00Z") / 1000);
  });
});
