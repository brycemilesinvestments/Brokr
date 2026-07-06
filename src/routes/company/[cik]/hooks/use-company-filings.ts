"use client";

import { useCallback, useMemo } from "react";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { Filing } from "@/routes/company/[cik]/types";

type UseCompanyFilingsInput = {
  initialFilings: Filing[];
  initialTotalShown: number;
  initialHasMoreFilings: boolean;
  enabled: boolean;
};

type UseCompanyFilingsResult = {
  filings: Filing[];
  totalShown: number;
  hasMoreFilings: boolean;
  isLoadingMore: boolean;
  loadError: string | null;
  loadRemainingFilings: () => void;
};

type CompanyFilingsResponse = {
  filings: Filing[];
  totalShown: number;
  hasMoreFilings: boolean;
};

export function useCompanyFilings(
  cik: string,
  {
    initialFilings,
    initialTotalShown,
    initialHasMoreFilings,
    enabled,
  }: UseCompanyFilingsInput,
): UseCompanyFilingsResult {
  const shouldAutoLoad = enabled && initialHasMoreFilings;
  const {
    data,
    loading: isLoadingMore,
    error: loadError,
    refetch,
  } = useCompanyApi<CompanyFilingsResponse>(
    shouldAutoLoad ? `/api/company/${cik}/filings` : null,
    shouldAutoLoad,
  );

  const loadedForCik = data && shouldAutoLoad;

  const filings = loadedForCik ? data.filings : initialFilings;
  const totalShown = loadedForCik ? data.totalShown : initialTotalShown;
  const hasMoreFilings = loadedForCik ? data.hasMoreFilings : initialHasMoreFilings;

  const loadRemainingFilings = useCallback(() => {
    if (!hasMoreFilings || isLoadingMore) return;
    void refetch();
  }, [hasMoreFilings, isLoadingMore, refetch]);

  return useMemo(
    () => ({
      filings,
      totalShown,
      hasMoreFilings,
      isLoadingMore,
      loadError,
      loadRemainingFilings,
    }),
    [filings, totalShown, hasMoreFilings, isLoadingMore, loadError, loadRemainingFilings],
  );
}
