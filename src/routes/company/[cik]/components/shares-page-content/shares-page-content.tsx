"use client";

import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import { OutstandingSharesChart } from "@/routes/company/[cik]/features/outstanding-shares/views/shares-view";
import type { OutstandingSharePoint } from "@/routes/company/[cik]/features/outstanding-shares/types";

type SharesPageContentProps = {
  points: OutstandingSharePoint[];
};

export function SharesPageContent({ points }: SharesPageContentProps) {
  return (
    <CompanyPanelPage title="Outstanding shares">
      <OutstandingSharesChart points={points} />
    </CompanyPanelPage>
  );
}
