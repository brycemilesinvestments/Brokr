import type { Filing } from "@/routes/company/[cik]/types";

export const FILING_ROW_FIXTURE: Filing = {
  type: "8-K",
  description: "Current report pursuant to Section 13 or 15(d)",
  documentsUrl: "https://www.sec.gov/",
  filingDate: "2025-01-15",
  accessionNumber: "0001193125-25-012345",
};
