import { describe, expect, it } from "vitest";
import { filterChartToAnnual } from "@/lib/peers/filter-chart";
import type { ChartBundle } from "@/lib/peers/types";

describe("filterChartToAnnual", () => {
  it("keeps only annual points per metric", () => {
    const chart: ChartBundle = {
      gross_margin: [
        { x: "2025-06-27", y: 0.35, frequency: "annual" },
        { x: "2026-04-03", y: 0.38, frequency: "quarterly" },
      ],
    };

    const annual = filterChartToAnnual(chart);
    expect(annual.gross_margin).toHaveLength(1);
    expect(annual.gross_margin![0].frequency).toBe("annual");
  });
});
