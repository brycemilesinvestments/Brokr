"use client";

import { useCallback, useMemo } from "react";
import { FilingsTable } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table";
import { isForm345Filing } from "@/routes/company/[cik]/features/filings/views/documents-view/filings-table/lib/is-form345-filing";
import { useForm345Pipeline } from "@/routes/company/[cik]/hooks/use-form345-pipeline";
import { useFilingPipeline } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { DocumentsViewProps } from "@/routes/company/[cik]/types";

export function DocumentsView({
  cik,
  ticker,
  filings,
  totalShown,
  hasMoreFilings = false,
  isLoadingMore = false,
  loadError = null,
  loadRemainingFilings,
  enabled,
}: DocumentsViewProps) {
  const pipelineEnabled = enabled && !isLoadingMore;

  const { getStatus: getFilingStatus, getError: getFilingError, progress } = useFilingPipeline(
    cik,
    filings,
    pipelineEnabled,
    ticker,
  );

  const {
    getStatus: getForm345Status,
    getError: getForm345Error,
    progress: form345Progress,
  } = useForm345Pipeline(cik, filings, pipelineEnabled);

  const filingByAccession = useMemo(() => {
    const map = new Map<string, (typeof filings)[number]>();
    for (const filing of filings) {
      if (filing.accessionNumber) {
        map.set(filing.accessionNumber, filing);
      }
    }
    return map;
  }, [filings]);

  const getStatus = useCallback(
    (accessionNumber: string | undefined) => {
      if (!accessionNumber) return "idle" as const;
      const filing = filingByAccession.get(accessionNumber);
      if (filing && isForm345Filing(filing.type)) {
        return getForm345Status(accessionNumber, filing.type);
      }
      return getFilingStatus(accessionNumber);
    },
    [filingByAccession, getFilingStatus, getForm345Status],
  );

  const getError = useCallback(
    (accessionNumber: string | undefined) => {
      if (!accessionNumber) return null;
      const filing = filingByAccession.get(accessionNumber);
      if (filing && isForm345Filing(filing.type)) {
        return getForm345Error(accessionNumber) ?? getFilingError(accessionNumber);
      }
      return getFilingError(accessionNumber);
    },
    [filingByAccession, getFilingError, getForm345Error],
  );

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
      form345Progress={form345Progress}
    />
  );
}
