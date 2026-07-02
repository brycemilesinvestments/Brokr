/**
 * Edgar chunk — SEC filing data access, parsing, and caching.
 */

export {
  EdgarClient,
  createEdgarClient,
  MIN_REQUEST_INTERVAL_MS,
  EDGAR_BUCKET,
} from "@/lib/edgar/client";
export type { EdgarClientOptions } from "@/lib/edgar/client";

export {
  fetchJson,
  fetchText,
  submissionsUrl,
  companyFactsUrl,
  filingIndexJsonUrl,
  resolveDocumentUrl,
  assertUserAgent,
  EdgarUserAgentError,
} from "@/lib/edgar/endpoints";

export {
  toFinancials,
  getLatestSharesOutstanding,
} from "@/lib/edgar/map-financials";

export { type FinancialConcept } from "@/lib/edgar/concepts";

export {
  type ParsedFinancialStatement,
  type ParsedFinancialMetrics,
  type MetricChange,
} from "@/lib/edgar/parse-ixbrl";

export type {
  CompanyTicker,
  CompanyMatch,
  CompanySearchResult,
  CompanyInfo,
  Filing,
  FilingDocument,
  FilingParty,
  FilingDetailPage,
  CompanyFilingsPage,
  ReportingOwner,
  InsiderTransaction,
  InsiderTransactionsPage,
  FilingRef,
  EdgarSubmission,
  CompanyFactUnit,
  CompanyFact,
  ConceptSeries,
  CompanyFactsResponse,
  EdgarFinancials,
} from "@/lib/edgar/types";

export {
  SEC_BASE_URL,
  SEC_DATA_URL,
  SEC_COMPANY_TICKERS_URL,
  SEC_USER_AGENT,
  DEFAULT_FILING_COUNT,
  formatCik,
  companyFilingsUrl,
  companySearchUrl,
  DEFAULT_INSIDER_COUNT,
  parseAccessionNumber,
  filingIndexUrl,
  filingDocumentUrl,
  filingPagePath,
  resolveFilingPagePath,
  issuerInsiderDispUrl,
} from "@/lib/edgar/constants";

export type {
  XbrlContext,
  XbrlUnit,
  XbrlFact,
  XbrlDocumentExtraction,
  FilingXbrlExtraction,
} from "@/lib/edgar/xbrl/types";

export { extractIxbrl } from "@/lib/edgar/xbrl/extract-ixbrl";

export {
  type CoreFormCategory,
  type CoreFormMeta,
  CORE_FORM_META,
  CORE_FORM_CATEGORIES,
  isAmendment,
  classifyCoreForm,
} from "@/lib/edgar/core-forms";

export { resolveCompany, resolveCompanyByCik, resolveSecDocumentUrl } from "@/lib/edgar/resolve-company";

export {
  enumerateConcepts,
  computeCoverageDelta,
  classifyConcepts,
  locateProseSections,
  TIER1_USEFUL_CONCEPTS,
  FORWARD_NUMERIC_CONCEPTS,
} from "@/lib/edgar/discovery";

export type {
  UniverseConcept,
  CoverageDelta,
  ConceptTag,
  ConceptClassification,
  ForwardSignals,
  ForwardSignalSeries,
  SegmentGrowthRate,
  ProseSection,
  ProseSections,
  ProseSectionKey,
} from "@/lib/edgar/discovery";

export {
  type SeriesFrequency,
  type RawTimeSeriesPoint,
  type PeriodGap,
  type MetricSeriesPoint,
  type MetricSeries,
  type MetricSeriesBundle,
  ALL_WHITELISTED_CONCEPTS,
  buildMetricSeriesBundle,
  classifyFrequency,
  dedupeSeries,
  detectGaps,
} from "@/lib/edgar/time-series";
