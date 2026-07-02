import { describe, expect, it } from "vitest";
import {
  buildTimeSeriesState,
  isTimeSeriesComplete,
  validateTimeSeriesContract,
} from "@/lib/analysis";
import { ALL_WHITELISTED_CONCEPTS } from "@/lib/edgar";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";

describe("Analysis time-series", () => {
  const state = buildTimeSeriesState(sndkCompanyFacts as never);
  const validation = validateTimeSeriesContract(state);

  it("loads raw facts (C1)", () => {
    expect(state.rawFacts).not.toBeNull();
  });

  it("passes full completion contract for SNDK", () => {
    const failed = validation.checks.filter((c) => !c.passed);
    expect(failed).toEqual([]);
    expect(validation.passed).toBe(true);
    expect(isTimeSeriesComplete(state)).toBe(true);
  });

  it("every metric has annual and quarterly arrays (C2–C3)", () => {
    for (const concept of ALL_WHITELISTED_CONCEPTS) {
      const series = state.bundle!.metrics.series[concept];
      expect(series).toBeDefined();
      expect(Array.isArray(series.annual)).toBe(true);
      expect(Array.isArray(series.quarterly)).toBe(true);
    }
  });

  it("computes QoQ and YoY deltas on quarterly revenue (C7)", () => {
    const revenue = state.bundle!.metrics.series.RevenueFromContractWithCustomerExcludingAssessedTax;
    const withPrior = revenue.quarterly.filter((p) => p.deltaQoq !== undefined);
    expect(withPrior.length).toBeGreaterThan(0);

    const q2Points = revenue.quarterly.filter((p) => p.fp === "Q2" && p.deltaYoy !== undefined);
    expect(q2Points.length).toBeGreaterThan(0);
  });

  it("computes ratio series aligned to revenue periods (C8)", () => {
    const revenue = state.bundle!.metrics.series.RevenueFromContractWithCustomerExcludingAssessedTax;
    const grossMargin = state.bundle!.ratioSeries.gross_margin;
    const annual = grossMargin.filter((p) => p.frequency === "annual");
    const quarterly = grossMargin.filter((p) => p.frequency === "quarterly");
    expect(annual.length).toBe(revenue.annual.length);
    expect(quarterly.length).toBe(revenue.quarterly.length);
  });

  it("emits chart-ready points (C10)", () => {
    const chart = state.bundle!.chart.RevenueFromContractWithCustomerExcludingAssessedTax;
    expect(chart.length).toBeGreaterThan(0);
    for (const point of chart) {
      expect(point.x).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof point.y).toBe("number");
      expect(["annual", "quarterly"]).toContain(point.frequency);
    }
  });

  it("records not_reported metrics explicitly", () => {
    for (const { metric } of state.notReported) {
      expect(state.bundle!.metrics.series[metric].status).toBe("not_reported");
    }
  });
});
