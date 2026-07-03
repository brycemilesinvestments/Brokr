/** Route/UI types (legacy) */
export type CompanyTicker = {
  cik: number;
  ticker: string;
  title: string;
};

export type CompanyMatch = CompanyTicker & {
  score: number;
};

export type CompanySearchResult =
  | { kind: "single"; company: CompanyTicker }
  | { kind: "multiple"; matches: CompanyMatch[] }
  | { kind: "none"; query: string };

export type CompanyInfo = {
  name: string;
  cik: string;
  sic?: string;
  sicDescription?: string;
  state?: string;
  stateOfIncorporation?: string;
  fiscalYearEnd?: string;
  mailingAddress: string[];
  businessAddress: string[];
  phone?: string;
};

export type Filing = {
  type: string;
  description: string;
  documentsUrl?: string;
  filingDate: string;
  filingHref?: string;
  accessionNumber?: string;
  size?: string;
};

export type FilingDocument = {
  sequence?: string;
  description: string;
  documentName: string;
  documentUrl: string;
  type?: string;
  size?: string;
};

export type FilingParty = {
  name: string;
  role?: string;
  cik?: string;
  roleUrl?: string;
  filingsUrl?: string;
  mailingAddress: string[];
  businessAddress: string[];
  identInfo?: string;
};

export type FilingDetailPage = {
  cik: string;
  accessionNumber: string;
  formType: string;
  formDescription: string;
  filingDate?: string;
  accepted?: string;
  documentCount?: string;
  periodOfReport?: string;
  documents: FilingDocument[];
  parties: FilingParty[];
  secUrl: string;
};

export type CompanyFilingsPage = {
  cik: string;
  info: CompanyInfo;
  filings: Filing[];
  secUrl: string;
  totalShown: number;
  hasMoreFilings?: boolean;
};

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
  form?: string;
  transactionType?: string;
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

/** Chunk 1 architecture types */

export type FilingRef = {
  cik: string;
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument?: string;
  /** Comma-separated 8-K item codes from submissions.json (e.g. "2.02,9.01"). */
  items?: string;
};

export type EdgarSubmission = {
  cik: string;
  entityName: string;
  filings: FilingRef[];
};

export type CompanyFactUnit = {
  end?: string;
  start?: string;
  val: number;
  accn: string;
  fy?: number;
  fp?: string;
  form: string;
  filed: string;
  frame?: string;
};

export type CompanyFact = {
  taxonomy: string;
  concept: string;
  label: string;
  description?: string;
  units: Record<string, CompanyFactUnit[]>;
};

export type ConceptSeries = {
  concept: string;
  taxonomy: string;
  unit: string;
  points: CompanyFactUnit[];
};

export type CompanyFactsResponse = {
  cik: string;
  entityName: string;
  facts: Record<string, Record<string, Omit<CompanyFact, "taxonomy" | "concept"> & { label: string }>>;
};

/** Mapped financial snapshot produced by Edgar chunk (consumed by analysis). */
export type EdgarFinancials = {
  cik: string;
  entityName: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  stockholdersEquity?: number;
  sharesOutstanding?: number;
  fiscalYear?: number;
  fiscalPeriod?: string;
  asOfDate?: string;
  priorRevenue?: number;
  priorGrossProfit?: number;
};
