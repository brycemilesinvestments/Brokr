import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTimeSeriesBundle } from "@/lib/analysis";
import { extractIxbrl } from "@/lib/edgar";
import {
  buildExtendedMetricsBundle,
  computeBacklogSeries,
  computeCashFlowQuality,
  computeSegmentBreakout,
  computeWorkingCapital,
} from "@/lib/metrics";
import sndkCompanyFacts from "../../fixtures/sndk-companyfacts.json";

const sndkIxbrl = readFileSync(
  join(process.cwd(), "tests/fixtures/sndk-10q-ixbrl.htm"),
  "utf8",
);
const sndkIxbrlFacts = extractIxbrl(sndkIxbrl).facts;

describe("Metrics chunk", () => {
  const timeSeries = buildTimeSeriesBundle(sndkCompanyFacts as never);
  const bundle = buildExtendedMetricsBundle(
    timeSeries,
    sndkCompanyFacts as never,
    sndkIxbrlFacts,
  );

  it("computes SNDK YTD FCF = OperatingCF − capex (C7.1)", () => {
    const { cashFlowQuality } = computeCashFlowQuality(timeSeries.metrics, sndkCompanyFacts as never);
    const ytd = cashFlowQuality.freeCashFlow.quarterly.find(
      (p) => p.periodEnd === "2026-04-03" && p.fp === "Q3",
    );
    expect(ytd?.value).toBe(4_411_000_000);
  });

  it("reflects DSO spike when AR jumps (C7.2)", () => {
    const { workingCapital } = computeWorkingCapital(timeSeries.metrics);
    const q2 = workingCapital.dso.quarterly.find((p) => p.periodEnd === "2026-01-02");
    const q3 = workingCapital.dso.quarterly.find((p) => p.periodEnd === "2026-04-03");
    expect(q2?.value).toBeDefined();
    expect(q3?.value).toBeDefined();
    expect(q3!.value!).toBeGreaterThan(q2!.value!);
  });

  it("returns null DIO for zero COGS without crashing (C7.2 guard)", () => {
    const metrics = {
      ...timeSeries.metrics,
      series: {
        ...timeSeries.metrics.series,
        CostOfGoodsAndServicesSold: {
          concept: "CostOfGoodsAndServicesSold",
          status: "reported" as const,
          annual: [],
          quarterly: [
            {
              periodEnd: "2026-04-03",
              value: 0,
              filed: "2026-05-01",
              form: "10-Q",
              accn: "test",
              unit: "USD",
              fp: "Q3",
            },
          ],
          gaps: [],
        },
      },
    };

    const { workingCapital } = computeWorkingCapital(metrics);
    const dio = workingCapital.dio.quarterly.find((p) => p.periodEnd === "2026-04-03");
    expect(dio?.value).toBeUndefined();
    expect(dio?.skipReason).toMatch(/zero COGS/i);
  });

  it("records backlog RPO at 2026-04-03 (C7.5)", () => {
    const backlog = computeBacklogSeries(sndkCompanyFacts as never);
    expect(backlog.status).toBe("reported");
    const point = [...backlog.annual, ...backlog.quarterly].find(
      (p) => p.periodEnd === "2026-04-03",
    );
    expect(point?.value).toBe(41_600_000_000);
  });

  it("surfaces SNDK datacenter revenue for Q3'25 and Q3'26 (C7.4)", () => {
    const { endMarket, geography } = computeSegmentBreakout(sndkIxbrlFacts);
    const datacenter = endMarket.find((series) => series.segmentName === "datacenter");
    const edge = endMarket.find((series) => series.segmentName === "edge");
    const consumer = endMarket.find((series) => series.segmentName === "consumer");

    expect(datacenter?.status).toBe("reported");
    expect(edge?.status).toBe("reported");
    expect(consumer?.status).toBe("reported");

    const q3_26 = datacenter?.quarterly.find((p) => p.periodEnd === "2026-04-03");
    const q3_25 = datacenter?.quarterly.find((p) => p.periodEnd === "2025-03-28");

    expect(q3_26?.value).toBe(1_467_000_000);
    expect(q3_25?.value).toBe(197_000_000);

    const asia = geography.find((series) => series.segmentName === "Asia");
    const americas = geography.find((series) => series.segmentName === "Americas");
    const emea = geography.find((series) => series.segmentName === "EMEA");

    expect(asia?.quarterly.find((p) => p.periodEnd === "2026-04-03")?.value).toBe(4_272_000_000);
    expect(americas?.quarterly.find((p) => p.periodEnd === "2026-04-03")?.value).toBe(
      1_209_000_000,
    );
    expect(emea?.quarterly.find((p) => p.periodEnd === "2026-04-03")?.value).toBe(469_000_000);
  });

  it("emits ChartBundle-compatible output (C7.6)", () => {
    expect(bundle.chart.free_cash_flow?.length).toBeGreaterThan(0);
    for (const point of bundle.chart.free_cash_flow ?? []) {
      expect(point.x).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof point.y).toBe("number");
      expect(["annual", "quarterly"]).toContain(point.frequency);
    }

    const datacenterChart = bundle.chart["end_market:datacenter"];
    expect(datacenterChart?.length).toBeGreaterThan(0);
    expect(datacenterChart?.some((point) => point.y === 197_000_000)).toBe(true);
    expect(datacenterChart?.some((point) => point.y === 1_467_000_000)).toBe(true);
    expect(bundle.chart["geography:Asia"]?.length).toBeGreaterThan(0);
  });

  it("records explicit reasons for missing metrics (C7.7)", () => {
    const dpoMissing = bundle.missing.some(
      (m) => m.metric === "dpo" && m.reason.includes("accounts payable"),
    );
    expect(dpoMissing).toBe(true);
  });
});
