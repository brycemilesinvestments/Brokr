"use client";

import { DocumentsSection } from "@/routes/company/[cik]/components/documents-section/documents-section";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";
import type { DocumentsPageData } from "@/routes/company/[cik]/lib/fetch-documents-page-data";

type DocumentsPageContentProps = DocumentsPageData & {
  view: "list" | "timeline";
};

export function DocumentsPageContent({
  view,
  companyName,
  timeline,
  fiscalYearEnd,
}: DocumentsPageContentProps) {
  const { cik, ticker, sidebarMenuButton } = useCompanyLayoutShell();

  return (
    <DocumentsSection
      cik={cik}
      companyName={companyName}
      ticker={ticker}
      timeline={timeline}
      fiscalYearEnd={fiscalYearEnd}
      view={view}
      headerLeading={sidebarMenuButton}
    />
  );
}
