import { describe, expect, it } from "vitest";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";
import {
  ANALYSIS_FILTER_OPTIONS,
  getAnalysisFilterOption,
  matchesAnalysisFilter,
} from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/analysis-filter";

const analyzableFiling: Filing = {
  type: "8-K",
  description: "Current report",
  filingDate: "2025-01-01",
  accessionNumber: "0001193125-25-000001",
};

const otherFiling: Filing = {
  type: "4",
  description: "Statement of changes in beneficial ownership",
  filingDate: "2025-01-02",
  accessionNumber: "0001193125-25-000002",
};

function statusFor(accession: string | undefined, status: FilingWorkStatus) {
  return () => (accession === analyzableFiling.accessionNumber ? status : "idle");
}

describe("analysis filter", () => {
  it("maps analyzable filings to granular analysis statuses", () => {
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "complete")),
    ).toBe("Analyzed");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "queued-analyze")),
    ).toBe("Queued");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "queued-store")),
    ).toBe("Queued");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "analyzing")),
    ).toBe("Processing");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "storing")),
    ).toBe("Processing");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "unavailable")),
    ).toBe("Unavailable");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "error")),
    ).toBe("Failed");
    expect(
      getAnalysisFilterOption(analyzableFiling, statusFor(analyzableFiling.accessionNumber, "idle")),
    ).toBe("Not started");
    expect(getAnalysisFilterOption(otherFiling, () => "idle")).toBeNull();
  });

  it("shows non-analyzable filings only when all analysis options are selected", () => {
    const allSelected = new Set(ANALYSIS_FILTER_OPTIONS);
    const analyzedOnly = new Set(["Analyzed"]);

    expect(matchesAnalysisFilter(otherFiling, allSelected, () => "idle")).toBe(true);
    expect(matchesAnalysisFilter(otherFiling, analyzedOnly, () => "idle")).toBe(false);
  });

  it("filters analyzable filings by selected analysis status", () => {
    const analyzedOnly = new Set(["Analyzed"]);
    const failedOnly = new Set(["Failed"]);
    const queuedOnly = new Set(["Queued"]);

    expect(
      matchesAnalysisFilter(
        analyzableFiling,
        analyzedOnly,
        statusFor(analyzableFiling.accessionNumber, "complete"),
      ),
    ).toBe(true);
    expect(
      matchesAnalysisFilter(
        analyzableFiling,
        failedOnly,
        statusFor(analyzableFiling.accessionNumber, "complete"),
      ),
    ).toBe(false);
    expect(
      matchesAnalysisFilter(
        analyzableFiling,
        failedOnly,
        statusFor(analyzableFiling.accessionNumber, "error"),
      ),
    ).toBe(true);
    expect(
      matchesAnalysisFilter(
        analyzableFiling,
        queuedOnly,
        statusFor(analyzableFiling.accessionNumber, "queued-analyze"),
      ),
    ).toBe(true);
    expect(
      matchesAnalysisFilter(
        analyzableFiling,
        queuedOnly,
        statusFor(analyzableFiling.accessionNumber, "error"),
      ),
    ).toBe(false);
  });
});
