export type TransactionCodeEntry = {
  code: string;
  category: string;
  description: string;
  is_routine_default: boolean;
  notes: string;
  source_url: string;
};

export type FootnoteCitationEntry = {
  pattern: string;
  rule_ref: string | null;
  classification: string;
  requires_date_extraction: boolean;
  date_extraction_hint?: string;
  source_url: string;
};

export type ClassificationTier = 1 | 2 | 3;

export type ParsedOwnershipRow = {
  lineIndex: number;
  issuerCik: string;
  issuerName: string | null;
  ticker: string | null;
  reportingOwnerName: string;
  reportingOwnerCik: string | null;
  isDirector: boolean | null;
  isOfficer: boolean | null;
  isTenPctOwner: boolean | null;
  isOther: boolean | null;
  officerTitle: string | null;
  securityTitle: string;
  isDerivative: boolean;
  transactionCode: string | null;
  transactionDate: string | null;
  is10b51Checkbox: boolean | null;
  sharesAmount: number | null;
  acquiredOrDisposed: string | null;
  pricePerShare: number | null;
  sharesOwnedFollowing: number | null;
  ownershipForm: string | null;
  natureOfIndirectOwnership: string | null;
  footnoteRawText: string | null;
  footnoteIds: string[];
};

export type ParsedOwnershipFiling = {
  formType: string;
  periodOfReport: string | null;
  issuerCik: string;
  issuerName: string | null;
  ticker: string | null;
  reportingOwnerName: string;
  reportingOwnerCik: string | null;
  isDirector: boolean | null;
  isOfficer: boolean | null;
  isTenPctOwner: boolean | null;
  isOther: boolean | null;
  officerTitle: string | null;
  is10b51Checkbox: boolean | null;
  footnotes: Record<string, string>;
  rows: ParsedOwnershipRow[];
  parseWarnings: Array<{ elementPath: string; message: string; rawFragment?: string }>;
};

export type ClassifiedTransactionRow = ParsedOwnershipRow & {
  footnoteHash: string | null;
  footnoteCitationMatched: string | null;
  footnoteClassification: string | null;
  planAdoptionDate: string | null;
  classificationTier: ClassificationTier;
  needsAiReview: boolean;
  aiModelUsed: string | null;
  aiClassificationText: string | null;
  vestingEventId: string | null;
};

export type IngestForm345Result = {
  accessionNumber: string;
  skipped: boolean;
  formType: string;
  rowsInserted: number;
  tier3Calls: number;
  cacheHits: number;
  cacheMisses: number;
  parseWarnings: number;
};

export type IngestForm345BatchResult = {
  filingsProcessed: number;
  filingsSkipped: number;
  tier3Calls: number;
  cacheHits: number;
  cacheMisses: number;
  failures: Array<{ accessionNumber: string; error: string }>;
};
