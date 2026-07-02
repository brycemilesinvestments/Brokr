/** Outstanding shares feature — /company/[cik] shares tab */

export type OutstandingSharePoint = {
  asOfDate: string;
  shares: number;
  form: string;
  filedDate: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  accessionNumber: string;
  source: "cover-page" | "balance-sheet";
  filingUrl: string;
};
