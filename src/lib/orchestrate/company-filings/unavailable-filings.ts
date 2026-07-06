/** SEC filing index exists but no 8-K primary document is listed. */
export const UNAVAILABLE_8K_NO_DOCUMENT_REASON =
  "No 8-K document found in filing index";

/** SEC filing index exists but no 10-K primary document is listed. */
export const UNAVAILABLE_10K_NO_DOCUMENT_REASON =
  "No 10-K document found in filing index";

/**
 * Accessions confirmed missing from SEC filing indexes (legacy filings).
 * Checked before any SEC fetch so the pipeline does not retry indefinitely.
 */
export const KNOWN_UNAVAILABLE_FILINGS: Readonly<Record<string, string>> = {
  "0001095811-00-000084": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0001095811-00-000047": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-99-002630": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-99-002587": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-99-002543": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-99-002529": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-99-002393": UNAVAILABLE_8K_NO_DOCUMENT_REASON,
  "0000892569-98-002462": UNAVAILABLE_10K_NO_DOCUMENT_REASON,
  "0000892569-97-002550": UNAVAILABLE_10K_NO_DOCUMENT_REASON,
  "0000892569-96-001855": UNAVAILABLE_10K_NO_DOCUMENT_REASON,
  "0000892569-95-000540": UNAVAILABLE_10K_NO_DOCUMENT_REASON,
  "0000892569-94-000280": UNAVAILABLE_10K_NO_DOCUMENT_REASON,
};

export function getKnownUnavailableReason(accessionNumber: string): string | null {
  return KNOWN_UNAVAILABLE_FILINGS[accessionNumber] ?? null;
}

export function isKnownUnavailableAccession(accessionNumber: string): boolean {
  return accessionNumber in KNOWN_UNAVAILABLE_FILINGS;
}

function unavailableFormSlug(formType: string): string {
  if (/^8-K/i.test(formType)) return "8k";
  if (/^10-K/i.test(formType)) return "10k";
  return "filing";
}

export function unavailableDocumentPath(accessionNumber: string, formType: string): string {
  return `unavailable/${unavailableFormSlug(formType)}/${accessionNumber}.missing`;
}
