"use client";

import { QuarterlyAnalysisPanel } from "@/routes/company/[cik]/features/quarterly-analysis";
import { useCompanyLayoutShell } from "@/routes/company/[cik]/components/company-layout-shell/company-layout-shell";
import type { Filing } from "@/routes/company/[cik]/types";

type AnalysisPageContentProps = {
  cik: string;
  filings: Filing[];
  ticker?: string;
};

export function AnalysisPageContent({ cik, filings, ticker }: AnalysisPageContentProps) {
  const { companySidebarOpen, sidebarMenuButton } = useCompanyLayoutShell();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!companySidebarOpen ? (
        <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-zinc-200 bg-white px-5">
          {sidebarMenuButton}
        </div>
      ) : null}
      <QuarterlyAnalysisPanel cik={cik} filings={filings} ticker={ticker} />
    </div>
  );
}
