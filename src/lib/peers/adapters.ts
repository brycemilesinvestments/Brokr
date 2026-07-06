import { formatCik, fetchSec } from "@/lib/edgar";
import { submissionsUrl } from "@/lib/edgar/endpoints";

type SecSubmissionsShape = {
  sic?: string;
  filings?: {
    recent?: {
      filingDate?: string[];
    };
  };
};

type SecEdgarCompanyRow = { cik: string; entityName: string };

/**
 * Parse company rows from SEC EDGAR company-list HTML (SIC search).
 * Used by fetchCompaniesBySicFromSec; separated for testability.
 */
function parseSecEdgarCompanyList(html: string): SecEdgarCompanyRow[] {
  const rows: SecEdgarCompanyRow[] = [];
  const tablePattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const cikPattern = /CIK=(\d+)/i;
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();

  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    const rowHtml = tableMatch[1];
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }
    if (cells.length < 2) continue;

    const cikCell = stripTags(cells[0]);
    const nameCell = stripTags(cells[1]);
    if (!cikCell || !nameCell) continue;

    const cikNum = cikCell.replace(/\D/g, "");
    if (!cikNum) continue;

    const hrefMatch = cikPattern.exec(cells[0]);
    const cik = formatCik(hrefMatch ? hrefMatch[1] : cikNum);
    const entityName = nameCell.replace(/\s*SIC:.*/i, "").trim();
    if (entityName) {
      rows.push({ cik, entityName });
    }
  }
  return rows;
}

/**
 * Fetch SIC code from the SEC submissions JSON endpoint.
 * Suitable for production use; inject a stub for tests.
 */
/**
 * Fetch the most recent SEC filing date for a CIK (submissions feed).
 */
export async function fetchLastFilingDateFromSec(cik: string): Promise<string | null> {
  const url = submissionsUrl(cik);
  try {
    const response = await fetchSec(url);
    if (!response.ok) return null;
    const data = (await response.json()) as SecSubmissionsShape;
    const dates = data.filings?.recent?.filingDate;
    return dates?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchSicFromSec(cik: string): Promise<string | null> {
  const url = submissionsUrl(cik);
  try {
    const response = await fetchSec(url);
    if (!response.ok) return null;
    const data = (await response.json()) as SecSubmissionsShape;
    return data.sic ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch companies sharing a SIC code from SEC EDGAR.
 * Suitable for production use; inject a stub for tests.
 */
export async function fetchCompaniesBySicFromSec(
  sic: string,
): Promise<Array<{ cik: string; entityName: string }>> {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&SIC=${encodeURIComponent(sic)}&type=10-K&dateb=&owner=include&count=40&search_text=`;
  try {
    const response = await fetchSec(url);
    if (!response.ok) return [];
    const html = await response.text();
    return parseSecEdgarCompanyList(html);
  } catch {
    return [];
  }
}
