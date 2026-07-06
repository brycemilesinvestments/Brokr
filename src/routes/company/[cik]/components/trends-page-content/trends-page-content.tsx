"use client";

import { FinancialTrendsPanel } from "@/routes/company/[cik]/features/financial-trends";
import { CompanyPanelPage } from "@/routes/company/[cik]/components/company-panel-page/company-panel-page";
import type { FinancialTrendsPayload } from "@/routes/company/[cik]/features/financial-trends/types";

type TrendsPageContentProps = {
  data: FinancialTrendsPayload | null;
};

export function TrendsPageContent({ data }: TrendsPageContentProps) {
  if (!data) {
    return (
      <CompanyPanelPage title="SEC trends">
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-8">
          <p className="text-sm text-zinc-500">
            Could not load time series data from SEC company facts.
          </p>
        </section>
      </CompanyPanelPage>
    );
  }

  return (
    <CompanyPanelPage title="SEC trends">
      <FinancialTrendsPanel data={data} />
    </CompanyPanelPage>
  );
}
