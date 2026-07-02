import { formatCik, SEC_USER_AGENT } from "@/lib/edgar/constants";
import type { FilingDocument } from "@/lib/edgar/types";
import { resolveSecDocumentUrl } from "@/lib/edgar/resolve-company";
import { isXbrlFactDocument } from "@/lib/edgar/xbrl/document-kind";
import { extractIxbrl } from "@/lib/edgar/xbrl/extract-ixbrl";
import type {
  FilingXbrlExtraction,
  XbrlDocumentExtraction,
} from "@/lib/edgar/xbrl/types";

async function defaultFetchMarkup(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch XBRL document (${response.status})`);
  }

  return response.text();
}

async function extractDocument(
  document: FilingDocument,
  fetchMarkup: (url: string, document: FilingDocument) => Promise<string>,
): Promise<XbrlDocumentExtraction | null> {
  const documentUrl = resolveSecDocumentUrl(document.documentUrl);
  if (!documentUrl || !isXbrlFactDocument(document)) return null;

  const markup = await fetchMarkup(documentUrl, document);
  const { contexts, units, facts } = extractIxbrl(markup);

  if (facts.length === 0) return null;

  return {
    documentName: document.documentName,
    documentUrl,
    documentType: document.type,
    contexts,
    units,
    facts,
  };
}

export async function fetchFilingXbrl(
  cikInput: string | number,
  accessionNumber: string,
  documents: FilingDocument[],
  options: {
    documentName?: string;
    fetchMarkup?: (url: string, document: FilingDocument) => Promise<string>;
  } = {},
): Promise<FilingXbrlExtraction> {
  const cik = formatCik(cikInput);
  const fetchMarkup = options.fetchMarkup ?? ((url) => defaultFetchMarkup(url));
  const xbrlDocuments = documents.filter(isXbrlFactDocument);
  const targets = options.documentName
    ? xbrlDocuments.filter((doc) => doc.documentName === options.documentName)
    : xbrlDocuments;

  const extractions = await Promise.all(
    targets.map((doc) => extractDocument(doc, fetchMarkup)),
  );
  const documentsWithFacts = extractions.filter(
    (doc): doc is XbrlDocumentExtraction => doc !== null,
  );

  return {
    cik,
    accessionNumber,
    documents: documentsWithFacts,
    totalFacts: documentsWithFacts.reduce((sum, doc) => sum + doc.facts.length, 0),
  };
}
