"use client";

import { FilingsTable } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table";
import { useCompanyFilingPipeline } from "@/routes/company/[cik]/components/company-filing-pipeline";
import type { DocumentsViewProps } from "@/routes/company/[cik]/types";

export function DocumentsView({ cik }: Pick<DocumentsViewProps, "cik">) {
  const {
    filings,
    totalShown,
    hasMoreFilings,
    isLoadingMore,
    loadError,
    loadRemainingFilings,
    getStatus,
    getError,
    progress,
  } = useCompanyFilingPipeline();

  return (
    <FilingsTable
      cik={cik}
      filings={filings}
      totalShown={totalShown}
      hasMoreFilings={hasMoreFilings}
      isLoadingMore={isLoadingMore}
      loadError={loadError}
      loadRemainingFilings={loadRemainingFilings}
      getAnalysisStatus={getStatus}
      getAnalysisError={getError}
      pipelineProgress={progress}
    />
  );
}
