import { SEC_BASE_URL } from "@/lib/edgar";
import type { FilingDocument } from "@/routes/company/[cik]/filing/[accession]/types";

export function filingDocumentArchivePath(
  cik: string,
  accessionNumber: string,
  documentUrl: string,
): string | undefined {
  const numericCik = String(cik).replace(/\D/g, "").replace(/^0+/, "") || "0";
  const accessionPath = accessionNumber.replace(/-/g, "");
  const prefix = `/Archives/edgar/data/${numericCik}/${accessionPath}/`;

  try {
    const pathname = documentUrl.startsWith("http")
      ? new URL(documentUrl).pathname
      : documentUrl.startsWith("/")
        ? documentUrl
        : `/${documentUrl}`;

    if (!pathname.startsWith(prefix)) return undefined;
    return pathname.slice(prefix.length);
  } catch {
    return undefined;
  }
}

export function isEmbeddableFilingDocument(document: FilingDocument): boolean {
  if (!document.documentUrl) return false;

  const displayName = document.documentName.toLowerCase();
  if (/\.(htm|html)$/.test(displayName)) return true;
  if (/ixbrl/i.test(document.type ?? "")) return true;

  try {
    const pathname = document.documentUrl.startsWith("http")
      ? new URL(document.documentUrl).pathname
      : document.documentUrl;
    if (/\.(htm|html)$/i.test(pathname)) return true;
  } catch {
    return false;
  }

  return false;
}
