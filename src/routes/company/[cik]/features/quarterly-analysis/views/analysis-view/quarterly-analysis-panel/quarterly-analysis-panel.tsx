"use client";

import { Button } from "@/components/ui/button";
import { CompanyAnalysisLoading } from "@/components/bones/company-analysis-loading";
import { useCompanyAnalysis } from "@/routes/company/[cik]/features/quarterly-analysis/hooks/use-company-analysis";
import type { CompanyAnalysisPanelProps } from "@/routes/company/[cik]/features/quarterly-analysis/types";
import { AnalysisDashboard } from "./components/analysis-dashboard";

function CompanyAnalysisPanel({ cik, filings, ticker }: CompanyAnalysisPanelProps) {
  const { data, loading, error, missing, refetch, compile } = useCompanyAnalysis(cik, true, ticker);

  if (loading) {
    return <CompanyAnalysisLoading />;
  }

  if (error) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-zinc-900">Company analysis</h2>
        </div>
        <div className="px-6 py-8">
          <p className="text-sm text-zinc-600">{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {missing ? (
              <Button onClick={() => void compile()}>Compile analysis</Button>
            ) : null}
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return <AnalysisDashboard cik={cik} filings={filings} data={data} ticker={ticker} />;
}

/** @deprecated Use CompanyAnalysisPanel */
export const QuarterlyAnalysisPanel = CompanyAnalysisPanel;
