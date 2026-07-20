"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useCompanyFilings } from "@/routes/company/[cik]/hooks/use-company-filings";
import {
  useFilingPipeline,
  type FilingPipelineProgress,
  type FilingWorkStatus,
} from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";

type CompanyFilingPipelineContextValue = {
  filings: Filing[];
  totalShown: number;
  hasMoreFilings: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  loadRemainingFilings: () => void;
  getStatus: (accessionNumber: string | undefined) => FilingWorkStatus;
  getError: (accessionNumber: string | undefined) => string | null;
  progress: FilingPipelineProgress;
};

const CompanyFilingPipelineContext = createContext<CompanyFilingPipelineContextValue | null>(
  null,
);

type CompanyFilingPipelineProviderProps = {
  cik: string;
  ticker?: string;
  initialFilings: Filing[];
  initialTotalShown: number;
  initialHasMoreFilings: boolean;
  children: ReactNode;
};

export function CompanyFilingPipelineProvider({
  cik,
  ticker,
  initialFilings,
  initialTotalShown,
  initialHasMoreFilings,
  children,
}: CompanyFilingPipelineProviderProps) {
  const {
    filings,
    totalShown,
    hasMoreFilings,
    isLoadingMore,
    loadError,
    loadRemainingFilings,
  } = useCompanyFilings(cik, {
    initialFilings,
    initialTotalShown,
    initialHasMoreFilings,
    enabled: true,
  });

  const pipelineEnabled = !isLoadingMore;
  const { getStatus, getError, progress } = useFilingPipeline(
    cik,
    filings,
    pipelineEnabled,
    ticker,
  );

  const value = useMemo(
    () => ({
      filings,
      totalShown,
      hasMoreFilings,
      isLoadingMore,
      loadError,
      loadRemainingFilings,
      getStatus,
      getError,
      progress,
    }),
    [
      filings,
      totalShown,
      hasMoreFilings,
      isLoadingMore,
      loadError,
      loadRemainingFilings,
      getStatus,
      getError,
      progress,
    ],
  );

  return (
    <CompanyFilingPipelineContext value={value}>{children}</CompanyFilingPipelineContext>
  );
}

export function useCompanyFilingPipeline(): CompanyFilingPipelineContextValue {
  const context = useContext(CompanyFilingPipelineContext);
  if (!context) {
    throw new Error(
      "useCompanyFilingPipeline must be used within CompanyFilingPipelineProvider",
    );
  }
  return context;
}
