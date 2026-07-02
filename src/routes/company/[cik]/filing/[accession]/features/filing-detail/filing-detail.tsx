import { DocumentsTable } from "./components/documents-table";
import { DiscoveryPanel } from "./discovery-panel";
import { FilingDiffPanel } from "@/routes/company/[cik]/filing/[accession]/features/filing-diff";
import { FilersSection } from "./components/filers-section";
import { FilingHeader } from "./components/filing-header";
import { FilingXbrl } from "./filing-xbrl/filing-xbrl";
import type { FilingDetailProps } from "@/routes/company/[cik]/filing/[accession]/types";

export function FilingDetail({ filing, companyName, discovery }: FilingDetailProps) {
  return (
    <div className="space-y-6">
      <FilingHeader filing={filing} companyName={companyName} />
      {discovery && <DiscoveryPanel discovery={discovery} />}
      <FilingDiffPanel cik={filing.cik} accessionNumber={filing.accessionNumber} />
      <DocumentsTable documents={filing.documents} />
      <FilingXbrl
        cik={filing.cik}
        accessionNumber={filing.accessionNumber}
        documents={filing.documents}
      />
      <FilersSection parties={filing.parties} />
    </div>
  );
}
