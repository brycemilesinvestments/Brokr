export const SEC_BASE_URL = "https://www.sec.gov";
export const SEC_DATA_URL = "https://data.sec.gov";

export const SEC_COMPANY_TICKERS_URL = `${SEC_BASE_URL}/files/company_tickers.json`;

/** SEC requires a descriptive User-Agent. Prefer EDGAR_USER_AGENT, fallback SEC_EDGAR_USER_AGENT. */
export const SEC_USER_AGENT =
  process.env.EDGAR_USER_AGENT ??
  process.env.SEC_EDGAR_USER_AGENT ??
  "edgar-financial-model edgar-app/0.1 (contact@example.com)";

export const DEFAULT_FILING_COUNT = 100;

export function formatCik(cik: number | string): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

export function companyFilingsUrl(
  cik: number | string,
  count = DEFAULT_FILING_COUNT,
  start = 0,
) {
  const padded = formatCik(cik);
  const params = new URLSearchParams({
    action: "getcompany",
    CIK: padded,
    owner: "include",
    count: String(count),
  });

  if (start > 0) {
    params.set("start", String(start));
  }

  return `${SEC_BASE_URL}/cgi-bin/browse-edgar?${params.toString()}`;
}

export function companySearchUrl(query: string, count = DEFAULT_FILING_COUNT) {
  return `${SEC_BASE_URL}/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(query)}&owner=include&count=${count}`;
}

export const DEFAULT_INSIDER_COUNT = 80;

const DASHED_ACCESSION_PATTERN = /\d{10}-\d{2}-\d{6}/;

/** Extract SEC accession number from archive paths, viewer URLs, or query params. */
export function parseAccessionNumber(href?: string | null): string | undefined {
  if (!href) return undefined;

  try {
    const url = new URL(href, SEC_BASE_URL);
    const fromQuery = url.searchParams.get("accession_number");
    if (fromQuery) {
      const dashed = fromQuery.match(DASHED_ACCESSION_PATTERN)?.[0];
      if (dashed) return dashed;
    }
  } catch {
    // Relative or malformed URLs fall through to pattern matching.
  }

  const dashed = href.match(DASHED_ACCESSION_PATTERN)?.[0];
  if (dashed) return dashed;

  const compact = href.match(/\/(\d{18})(?:\/|[-.])/);
  if (compact) {
    const digits = compact[1];
    return `${digits.slice(0, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }

  return undefined;
}

export function filingIndexUrl(cik: number | string, accessionNumber: string): string {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `${SEC_BASE_URL}/Archives/edgar/data/${numericCik}/${accessionPath}/${accessionNumber}-index.htm`;
}

export function filingDocumentUrl(
  cik: number | string,
  accessionNumber: string,
  filename: string,
): string {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `${SEC_BASE_URL}/Archives/edgar/data/${numericCik}/${accessionPath}/${filename}`;
}

export function filingPagePath(cik: number | string, accessionNumber: string): string {
  return `/company/${formatCik(cik)}/filing/${encodeURIComponent(accessionNumber)}`;
}

export function resolveFilingPagePath(
  cik: number | string,
  filing: { accessionNumber?: string; filingHref?: string },
): string | undefined {
  const accessionNumber =
    filing.accessionNumber ?? parseAccessionNumber(filing.filingHref);
  if (!accessionNumber) return undefined;
  return filingPagePath(cik, accessionNumber);
}

export function issuerInsiderDispUrl(
  cik: number | string,
  start = 0,
) {
  const padded = formatCik(cik);
  const params = new URLSearchParams({
    action: "getissuer",
    CIK: padded,
    type: "",
    dateb: "",
    owner: "include",
  });

  if (start > 0) {
    params.set("start", String(start));
  }

  return `${SEC_BASE_URL}/cgi-bin/own-disp?${params.toString()}`;
}
