import { describe, expect, it } from "vitest";
import { prepareMetricTradingViewData } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/prepare-metric-tradingview-data";
import type { MetricChartRow } from "@/routes/company/[cik]/features/financial-trends/views/trends-view/financial-trends-panel/lib/build-metric-chart-geometry";

describe("prepareMetricTradingViewData", () => {
  it("deduplicates rows that share the same period end date", () => {
    const rows: MetricChartRow[] = [
      {
        x: "2024-06-28",
        y: 10,
        date: "2024-06-28",
        value: 10,
        frequency: "quarterly",
      },
      {
        x: "2024-06-28",
        y: 40,
        date: "2024-06-28",
        value: 40,
        frequency: "annual",
      },
      {
        x: "2024-09-30",
        y: 12,
        date: "2024-09-30",
        value: 12,
        frequency: "quarterly",
      },
    ];

    const prepared = prepareMetricTradingViewData(rows);

    expect(prepared.seriesData).toEqual([
      { time: "2024-06-28", value: 40 },
      { time: "2024-09-30", value: 12 },
    ]);
    expect(prepared.rowsByDate.get("2024-06-28")?.frequency).toBe("annual");
  });
});
