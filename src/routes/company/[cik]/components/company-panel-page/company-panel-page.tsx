"use client";

import type { ReactNode } from "react";
import { CompanyContentHeader } from "@/routes/company/[cik]/components/company-content-header/company-content-header";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";

type CompanyPanelPageProps = {
  title: string;
  children: ReactNode;
};

export function CompanyPanelPage({ title, children }: CompanyPanelPageProps) {
  const { ticker, sidebarMenuButton } = useCompanyLayoutShell();

  return (
    <>
      <CompanyContentHeader ticker={ticker} title={title} leading={sidebarMenuButton} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </>
  );
}
