"use client";

import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { PatternsPanel } from "@/routes/company/[cik]/features/patterns";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

export function PatternsPageContent() {
  const { cik } = useCompanyLayoutShell();

  return (
    <CompanyPanelPage title="Patterns">
      <PatternsPanel cik={cik} enabled />
    </CompanyPanelPage>
  );
}
