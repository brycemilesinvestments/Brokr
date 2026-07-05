import { describe, expect, it } from "vitest";
import { guessPolarityFromMetricKey } from "@/lib/metrics/polarity/heuristics";
import {
  deltaToneForPolarity,
  sentimentFromTrend,
} from "@/lib/metrics/polarity/tone";

describe("guessPolarityFromMetricKey", () => {
  it("marks revenue and profit metrics as higher_better", () => {
    expect(guessPolarityFromMetricKey("RevenueFromContractWithCustomerExcludingAssessedTax")).toBe(
      "higher_better",
    );
    expect(guessPolarityFromMetricKey("GrossProfit")).toBe("higher_better");
    expect(guessPolarityFromMetricKey("gross_margin")).toBe("higher_better");
  });

  it("marks liabilities and expense-like metrics as lower_better", () => {
    expect(guessPolarityFromMetricKey("Liabilities")).toBe("lower_better");
    expect(guessPolarityFromMetricKey("debt_to_equity")).toBe("lower_better");
    expect(guessPolarityFromMetricKey("capex_intensity")).toBe("lower_better");
    expect(guessPolarityFromMetricKey("sbc_pct_revenue")).toBe("lower_better");
  });

  it("treats segment revenue keys as higher_better", () => {
    expect(guessPolarityFromMetricKey("end_market:datacenter")).toBe("higher_better");
  });
});

describe("deltaToneForPolarity", () => {
  it("flips tone for lower_better metrics", () => {
    expect(deltaToneForPolarity("higher_better", 0.12)).toBe("positive");
    expect(deltaToneForPolarity("lower_better", 0.12)).toBe("negative");
    expect(deltaToneForPolarity("lower_better", -0.08)).toBe("positive");
  });
});

describe("sentimentFromTrend", () => {
  it("colors upward liability trends as negative", () => {
    expect(sentimentFromTrend("lower_better", "up")).toBe("negative");
    expect(sentimentFromTrend("higher_better", "up")).toBe("positive");
  });
});
