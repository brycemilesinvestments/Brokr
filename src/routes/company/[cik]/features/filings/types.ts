import type { CoreFormCategory, CoreFormMeta } from "@/lib/edgar/core-forms";
import type { Filing } from "@/routes/company/[cik]/types";

export type FiscalQuarter = "Q1" | "Q2" | "Q3" | "FY";

export type FiscalPeriod = {
  fiscalYear: number;
  quarter: FiscalQuarter | null;
};

export type TimelineFiling = Filing & {
  category: CoreFormCategory;
  meta: CoreFormMeta;
  isAmendment: boolean;
  timelineDate: string;
  reportDate: string | null;
  fiscalPeriod: FiscalPeriod | null;
};

export type FiscalYearGroup = {
  fiscalYear: number;
  filings: TimelineFiling[];
};

export type SubmissionFilingMeta = {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string;
  primaryDocument: string;
};
