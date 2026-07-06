import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  companyAnalysisHref,
  navigateToCompanyAnalysis,
} from "@/routes/company/[cik]/lib/navigate-to-company-analysis";

describe("companyAnalysisHref", () => {
  it("formats CIK and targets the analysis route", () => {
    expect(companyAnalysisHref("106040")).toBe("/company/0000106040/analysis");
  });
});

describe("navigateToCompanyAnalysis", () => {
  const router = { push: vi.fn() };

  beforeEach(() => {
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates to the analysis route", () => {
    navigateToCompanyAnalysis("106040", { router });

    expect(router.push).toHaveBeenCalledWith("/company/0000106040/analysis");
  });

  it("navigates when switching companies from the sidebar", () => {
    navigateToCompanyAnalysis("320193", { router, currentCik: "0000106040" });

    expect(router.push).toHaveBeenCalledWith("/company/0000320193/analysis");
  });
});
