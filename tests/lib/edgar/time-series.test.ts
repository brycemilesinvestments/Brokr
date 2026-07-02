import { describe, expect, it } from "vitest";
import {
  ALL_WHITELISTED_CONCEPTS,
  buildMetricSeriesBundle,
  classifyFrequency,
  dedupeSeries,
} from "@/lib/edgar/time-series";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";

describe("Edgar time-series", () => {
  const bundle = buildMetricSeriesBundle(sndkCompanyFacts as never);

  it("builds a series for every whitelisted concept", () => {
    for (const concept of ALL_WHITELISTED_CONCEPTS) {
      expect(bundle.series[concept]).toBeDefined();
    }
  });

  it("classifies FY as annual and Q1–Q3 as quarterly", () => {
    expect(classifyFrequency({ end: "2024-06-28", val: 1, fp: "FY", form: "10-K", filed: "2025-01-01", accn: "x" })).toBe("annual");
    expect(classifyFrequency({ end: "2024-06-28", val: 1, fp: "Q2", form: "10-Q", filed: "2025-01-01", accn: "x" })).toBe("quarterly");
    expect(
      classifyFrequency({
        start: "2024-01-01",
        end: "2024-03-31",
        val: 1,
        form: "10-Q",
        filed: "2025-01-01",
        accn: "x",
      }),
    ).toBe("quarterly");
  });

  it("dedupes by period_end keeping latest filed", () => {
    const deduped = dedupeSeries(
      [
        {
          periodEnd: "2023-12-29",
          value: 100,
          filed: "2025-03-07",
          form: "10-Q",
          accn: "a",
          unit: "USD",
          fp: "Q2",
        },
        {
          periodEnd: "2023-12-29",
          value: 100,
          filed: "2025-03-17",
          form: "10-Q/A",
          accn: "b",
          unit: "USD",
          fp: "Q2",
        },
      ],
      "quarterly",
    );
    expect(deduped).toHaveLength(1);
    expect(deduped[0].filed).toBe("2025-03-17");
  });

  it("separates annual and quarterly revenue series", () => {
    const revenue = bundle.series.RevenueFromContractWithCustomerExcludingAssessedTax;
    expect(revenue.status).toBe("reported");
    expect(revenue.annual.length).toBeGreaterThan(0);
    expect(revenue.quarterly.length).toBeGreaterThan(0);

    const annualEnds = new Set(revenue.annual.map((p) => p.periodEnd));
    for (const q of revenue.quarterly) {
      expect(annualEnds.has(q.periodEnd)).toBe(false);
    }
  });

  it("sorts series ascending by period_end", () => {
    const revenue = bundle.series.RevenueFromContractWithCustomerExcludingAssessedTax;
    const ends = revenue.quarterly.map((p) => p.periodEnd);
    const sorted = [...ends].sort((a, b) => a.localeCompare(b));
    expect(ends).toEqual(sorted);
  });

  it("records not_reported for concepts absent from facts", () => {
    const notReported = ALL_WHITELISTED_CONCEPTS.filter(
      (c) => bundle.series[c].status === "not_reported",
    );
    for (const concept of notReported) {
      expect(bundle.series[concept].annual).toHaveLength(0);
      expect(bundle.series[concept].quarterly).toHaveLength(0);
    }
  });
});
