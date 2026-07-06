import { describe, expect, it } from "vitest";
import {
  resolveChartPointFilingHref,
  resolveMetricFilingHref,
} from "@/routes/company/[cik]/features/quarterly-analysis/views/analysis-view/quarterly-analysis-panel/lib/resolve-metric-filing";
import type { Filing } from "@/routes/company/[cik]/types";

const filings: Filing[] = [
  {
    type: "10-Q",
    description: "Quarterly report for quarterly period ended March 31, 2026",
    filingDate: "2026-04-15",
    accessionNumber: "0000320193-26-000010",
  },
  {
    type: "10-K",
    description: "Annual report for fiscal year ended September 30, 2025",
    filingDate: "2025-11-01",
    accessionNumber: "0000320193-25-000079",
  },
];

describe("resolveMetricFilingHref", () => {
  it("matches quarterly filings by period end in description", () => {
    expect(resolveMetricFilingHref("320193", filings, "2026-03-31", "quarterly")).toBe(
      "/company/0000320193/filing/0000320193-26-000010",
    );
  });

  it("matches annual filings by period end in description", () => {
    expect(resolveMetricFilingHref("320193", filings, "2025-09-30", "annual")).toBe(
      "/company/0000320193/filing/0000320193-25-000079",
    );
  });
});

describe("resolveChartPointFilingHref", () => {
  it("prefers the chart point accession number for an exact filing route", () => {
    expect(
      resolveChartPointFilingHref("320193", filings, {
        date: "2026-03-31",
        frequency: "quarterly",
        accessionNumber: "0000320193-26-000010",
      }),
    ).toBe("/company/0000320193/filing/0000320193-26-000010");
  });

  it("falls back to period-end filing matching when accession is missing", () => {
    expect(
      resolveChartPointFilingHref("320193", filings, {
        date: "2025-09-30",
        frequency: "annual",
      }),
    ).toBe("/company/0000320193/filing/0000320193-25-000079");
  });
});
