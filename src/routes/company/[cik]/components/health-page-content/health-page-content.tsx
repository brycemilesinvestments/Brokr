"use client";

import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { HealthPanel } from "@/routes/company/[cik]/features/health";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

export function HealthPageContent() {
  const { cik } = useCompanyLayoutShell();

  return (
    <CompanyPanelPage title="Health">
      <HealthPanel cik={cik} enabled />
    </CompanyPanelPage>
  );
}
