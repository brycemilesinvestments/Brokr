"use client";

import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "./skeleton-names";

type FilingsAnalysisProgressProps = {
  complete: number;
  loading: number;
  queued: number;
  error: number;
  active: boolean;
};

function FilingsAnalysisProgressContent({
  complete,
  loading,
  queued,
  error,
}: Omit<FilingsAnalysisProgressProps, "active">) {
  return (
    <p className="mt-2 text-sm text-emerald-800">
      Analyzing 8-K and 10-K filings — {complete} complete
      {loading > 0 ? `, ${loading} in progress` : ""}
      {queued > 0 ? `, ${queued} queued` : ""}
      {error > 0 ? `, ${error} failed` : ""}.
    </p>
  );
}

export const FILINGS_ANALYSIS_PROGRESS_FIXTURE = {
  complete: 4,
  loading: 2,
  queued: 18,
  error: 0,
} as const;

export function FilingsAnalysisProgress({
  complete,
  loading,
  queued,
  error,
  active,
}: FilingsAnalysisProgressProps) {
  if (!active) return null;

  return (
    <Skeleton
      name={BONE_NAMES.filingsAnalysisProgress}
      loading={loading > 0}
      animate="pulse"
      color="rgba(16, 185, 129, 0.12)"
      fixture={
        <FilingsAnalysisProgressContent {...FILINGS_ANALYSIS_PROGRESS_FIXTURE} />
      }
      fallback={
        <FilingsAnalysisProgressContent
          complete={complete}
          loading={loading}
          queued={queued}
          error={error}
        />
      }
    >
      <FilingsAnalysisProgressContent
        complete={complete}
        loading={loading}
        queued={queued}
        error={error}
      />
    </Skeleton>
  );
}
