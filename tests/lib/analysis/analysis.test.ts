import { describe, expect, it } from "vitest";
import {
  computeRatios,
  computeDeltas,
  detectAnomalies,
  exceedsThreshold,
  safeDivide,
  revenueYoYRatio,
} from "@/lib/analysis";
import sndkGolden from "../../fixtures/sndk-golden-data.json";

describe("Analysis chunk", () => {
  const sndkFinancials = {
    cik: "0002023554",
    entityName: "Sandisk Corporation",
    revenue: sndkGolden.financials.revenue.fy2024,
    grossProfit: sndkGolden.financials.revenue.fy2024 * sndkGolden.financials.grossMargin.fy2024,
    priorRevenue: sndkGolden.financials.revenue.fy2023,
    priorGrossProfit: sndkGolden.financials.revenue.fy2023 * sndkGolden.financials.grossMargin.fy2023,
  };

  it("SNDK gross margin ≈ 0.7835", () => {
    const ratios = computeRatios(sndkFinancials);
    expect(ratios.grossMargin).toBeCloseTo(0.7835, 3);
  });

  it("YoY revenue ratio change ≈ +2.51", () => {
    const deltas = computeDeltas(sndkFinancials);
    const revenueDelta = deltas.find((d) => d.metric === "revenue");
    expect(revenueDelta?.ratioChange).toBeCloseTo(2.51, 2);
  });

  it("detects gross margin anomaly", () => {
    const ratios = computeRatios(sndkFinancials);
    const anomalies = detectAnomalies(sndkFinancials, ratios);
    expect(anomalies.some((a) => a.metric === "grossMargin")).toBe(true);
  });

  it("safeDivide handles div-by-zero", () => {
    expect(safeDivide(10, 0)).toBeUndefined();
    expect(safeDivide(undefined, 5)).toBeUndefined();
  });

  it("threshold boundary is inclusive", () => {
    expect(exceedsThreshold(0.3, 0.3)).toBe(true);
    expect(exceedsThreshold(0.29, 0.3)).toBe(false);
  });

  it("revenueYoYRatio returns current/prior", () => {
    expect(revenueYoYRatio(sndkFinancials)).toBeCloseTo(5950000000 / 1695000000, 2);
  });
});
