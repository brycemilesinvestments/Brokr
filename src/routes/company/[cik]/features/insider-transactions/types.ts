/** Insider transactions feature — /company/[cik] insider tab */

export type ReportingOwner = {
  ownerName: string;
  ownerCik?: string;
  latestTransactionDate?: string;
  ownerType?: string;
  ownerUrl?: string;
  filingsUrl?: string;
};

export type InsiderTransaction = {
  acquiredOrDisposed?: "A" | "D";
  transactionDate: string;
  deemedExecutionDate?: string;
  reportingOwner: string;
  ownerType?: string;
  form?: string;
  transactionType?: string;
  /** Footnote/rulebook classification from the Form 3/4/5 ingest pipeline. */
  footnoteClassification?: string;
  directOrIndirect?: string;
  sharesTransacted?: number;
  sharesOwnedFollowing?: number;
  lineNumber?: number;
  ownerCik?: string;
  securityName?: string;
  formUrl?: string;
  accessionNumber?: string;
};

export type InsiderTransactionsPage = {
  cik: string;
  secUrl: string;
  reportingOwners: ReportingOwner[];
  transactions: InsiderTransaction[];
  totalShown: number;
};
