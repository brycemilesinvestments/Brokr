import { FilingDocumentViewers } from "./components/filing-document-viewers";
import { FilingHeader } from "./components/filing-header";
import type { FilingDetailProps } from "@/routes/company/[cik]/filing/[accession]/types";

export function FilingDetail({ filing, companyName }: FilingDetailProps) {
  return (
    <div className="space-y-6">
      <FilingHeader filing={filing} companyName={companyName} />
      <FilingDocumentViewers
        cik={filing.cik}
        accessionNumber={filing.accessionNumber}
        documents={filing.documents}
      />
    </div>
  );
}
