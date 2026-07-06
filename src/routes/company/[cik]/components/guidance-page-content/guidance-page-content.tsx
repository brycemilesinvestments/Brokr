"use client";

import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { GuidancePanel } from "@/routes/company/[cik]/features/guidance";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

export function GuidancePageContent() {
  const { cik } = useCompanyLayoutShell();

  return (
    <CompanyPanelPage title="Guidance">
      <GuidancePanel cik={cik} enabled />
    </CompanyPanelPage>
  );
}
