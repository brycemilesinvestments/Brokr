/** Company page domain types — /company/[cik] */

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

export type CompanyFilingsPage = {
  cik: string;
  info: CompanyInfo;
  filings: Filing[];
  secUrl: string;
  totalShown: number;
  hasMoreFilings: boolean;
};

export type Form10kSyncResponse = {
  companyId: number;
  edgarId: string;
  processedCount: number;
  errorCount: number;
  processed: Array<{
    accessionNumber: string;
    skippedStore: boolean;
    chunksStored: number;
    analysis: Record<string, unknown>;
    costUsd: number;
  }>;
  errors: Array<{ accessionNumber: string; message: string }>;
};

export type Form8kSyncResponse = {
  companyId: number;
  edgarId: string;
  processedCount: number;
  errorCount: number;
  processed: Array<{
    accessionNumber: string;
    skippedStore: boolean;
    chunksStored: number;
    classification: Record<string, unknown>;
    costUsd: number;
  }>;
  errors: Array<{ accessionNumber: string; message: string }>;
};

export type DocumentsViewProps = {
  cik: string;
  ticker?: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  enabled: boolean;
};
