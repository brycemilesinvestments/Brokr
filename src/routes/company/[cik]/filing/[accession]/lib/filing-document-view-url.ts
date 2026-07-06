import { formatCik } from "@/lib/edgar/constants";
import { filingDocumentArchivePath } from "@/routes/company/[cik]/filing/[accession]/lib/is-embeddable-filing-document";

export function filingDocumentViewUrl(
  cik: string,
  accessionNumber: string,
  documentUrl: string,
): string | undefined {
  const path = filingDocumentArchivePath(cik, accessionNumber, documentUrl);
  if (!path) return undefined;

  const params = new URLSearchParams({ path });
  return `/api/company/${formatCik(cik)}/filing/${encodeURIComponent(accessionNumber)}/document?${params.toString()}`;
}
