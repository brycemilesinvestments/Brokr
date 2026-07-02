import { SEC_BASE_URL } from "@/lib/edgar/constants";
import { extractIxbrl } from "@/lib/edgar/xbrl/extract-ixbrl";
import type { EdgarClient, XbrlFact } from "@/lib/edgar";

function filingDocumentArchiveUrl(
  cik: string,
  accessionNumber: string,
  documentName: string,
): string {
  const numericCik = cik.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `${SEC_BASE_URL}/Archives/edgar/data/${numericCik}/${accessionPath}/${documentName}`;
}

export async function fetchLatestIxbrlFacts(
  cik: string,
  edgar: EdgarClient,
): Promise<XbrlFact[]> {
  try {
    const submission = await edgar.getSubmissions(cik);
    const filing = submission.filings.find((f) => f.form === "10-Q" || f.form === "10-K");
    if (!filing?.primaryDocument) return [];

    const url = filingDocumentArchiveUrl(cik, filing.accessionNumber, filing.primaryDocument);
    const markup = await edgar.fetchText(url, {
      useCache: true,
      cik,
      accession: filing.accessionNumber,
      filename: filing.primaryDocument,
    });

    return extractIxbrl(markup).facts;
  } catch {
    return [];
  }
}
