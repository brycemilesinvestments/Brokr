import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";
import { fetchCompanyLayoutData } from "@/routes/company/[cik]/lib/fetch-company-layout-data";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ cik: string }>;
};

export default async function CompanyShellLayout({ children, params }: LayoutProps) {
  const { cik } = await params;
  const layoutData = await fetchCompanyLayoutData(cik);
  if (!layoutData) notFound();

  return (
    <CompanyLayoutShell
      cik={layoutData.cik}
      companyName={layoutData.companyName}
      ticker={layoutData.ticker}
      filings={layoutData.filings}
      showInsider={layoutData.showInsider}
    >
      {children}
    </CompanyLayoutShell>
  );
}
