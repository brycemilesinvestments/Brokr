"use client";

import { FilingsTable } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table";
import { useFilingAnalysisQueue } from "@/routes/company/[cik]/hooks/use-filing-analysis-queue";
import type { DocumentsViewProps } from "@/routes/company/[cik]/types";

export function DocumentsView({
  cik,
  ticker,
  filings,
  totalShown,
  hasMoreFilings = false,
  enabled,
}: DocumentsViewProps) {
  const { getStatus, getError, progress } = useFilingAnalysisQueue(cik, filings, enabled, ticker);

  return (
    <FilingsTable
      cik={cik}
      filings={filings}
      totalShown={totalShown}
      hasMoreFilings={hasMoreFilings}
      getAnalysisStatus={getStatus}
      getAnalysisError={getError}
      analysisProgress={progress}
    />
  );
}
