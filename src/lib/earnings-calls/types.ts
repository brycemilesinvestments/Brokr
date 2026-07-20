export type TranscriptSourceType = "sec_exhibit" | "ir_site";

export type TranscriptCandidate = {
  sourceUrl: string;
  sourceType: TranscriptSourceType;
  title?: string;
  eventDate?: string;
  fiscalPeriod?: string;
  linked8kAccession?: string;
  score: number;
  reasons: string[];
};

export type ScrapeTranscriptResult = {
  sourceUrl: string;
  title?: string;
  plainText: string;
  charCount: number;
  html?: string;
};

export type IngestTranscriptResult = {
  syntheticAccession: string;
  chunksStored: number;
  embedCalls: number;
  skippedDuplicate: boolean;
};

export type ScrapeTranscriptFailure = {
  sourceUrl: string;
  error: string;
};

export type EarningsCallScrapeResult = {
  cik: string;
  companyId: number;
  discovered: number;
  scraped: number;
  embedded: number;
  skipped: number;
  failures: ScrapeTranscriptFailure[];
  transcripts: Array<{
    sourceUrl: string;
    syntheticAccession: string;
    eventDate?: string;
    title?: string;
    charCount: number;
    embedded: boolean;
  }>;
};

export type DiscoverTranscriptsInput = {
  cik: string;
  filings: Array<{
    accessionNumber: string;
    form: string;
    filingDate: string;
    reportDate?: string;
    primaryDocument?: string;
    items?: string;
  }>;
  investorWebsite?: string | null;
  website?: string | null;
  limit?: number;
};
