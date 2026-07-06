"use client";

import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { PeersPanel } from "@/routes/company/[cik]/features/peers";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

export function PeersPageContent() {
  const { cik, ticker } = useCompanyLayoutShell();

  return (
    <CompanyPanelPage title="Peers">
      <PeersPanel cik={cik} ticker={ticker} enabled />
    </CompanyPanelPage>
  );
}
