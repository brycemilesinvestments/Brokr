import {
  SEC_BASE_URL,
  SEC_DATA_URL,
  SEC_USER_AGENT,
  formatCik,
} from "@/lib/edgar/constants";

export class EdgarUserAgentError extends Error {
  constructor() {
    super("SEC EDGAR User-Agent is required (set EDGAR_USER_AGENT or SEC_EDGAR_USER_AGENT)");
    this.name = "EdgarUserAgentError";
  }
}

export function assertUserAgent(userAgent?: string): string {
  const agent = userAgent ?? SEC_USER_AGENT;
  if (!agent || agent.trim().length === 0) {
    throw new EdgarUserAgentError();
  }
  return agent;
}

export function submissionsUrl(cik: string | number): string {
  return `${SEC_DATA_URL}/submissions/CIK${formatCik(cik)}.json`;
}

export function companyFactsUrl(cik: string | number): string {
  return `${SEC_DATA_URL}/api/xbrl/companyfacts/CIK${formatCik(cik)}.json`;
}

export function filingIndexJsonUrl(cik: string | number, accessionNumber: string): string {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `${SEC_BASE_URL}/Archives/edgar/data/${numericCik}/${accessionPath}/${accessionNumber}-index.json`;
}

/**
 * Resolve SEC inline-viewer /ix?doc= links to direct archive document URLs.
 * JSON endpoints are preferred; this handles HTML document paths.
 */
export function resolveDocumentUrl(
  documentPath: string,
  baseUrl: string = SEC_BASE_URL,
): string {
  if (documentPath.startsWith("http://") || documentPath.startsWith("https://")) {
    try {
      const url = new URL(documentPath);
      if (url.pathname === "/ix") {
        const doc = url.searchParams.get("doc");
        if (doc) {
          return resolveDocumentUrl(doc, baseUrl);
        }
      }
      return documentPath;
    } catch {
      return documentPath;
    }
  }

  if (documentPath.startsWith("/ix?") || documentPath.startsWith("ix?")) {
    const query = documentPath.includes("?") ? documentPath.split("?")[1] : "";
    const doc = new URLSearchParams(query).get("doc");
    if (doc) {
      return resolveDocumentUrl(doc, baseUrl);
    }
  }

  if (documentPath.startsWith("/")) {
    return baseUrl + documentPath;
  }
  return `${baseUrl}/${documentPath}`;
}

export async function fetchJson<T>(
  url: string,
  options?: RequestInit & { userAgent?: string },
): Promise<T> {
  const userAgent = assertUserAgent(options?.userAgent);
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchText(
  url: string,
  options?: RequestInit & { userAgent?: string },
): Promise<string> {
  const userAgent = assertUserAgent(options?.userAgent);
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.text();
}

async function fetchCompanyFacts(cik: string | number): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(companyFactsUrl(cik));
}

async function fetchFilingSummary(
  cik: string | number,
  accessionNumber: string,
): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(filingIndexJsonUrl(cik, accessionNumber));
}

async function fetchSubmissions(cik: string | number): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(submissionsUrl(cik));
}
