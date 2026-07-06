"use client";

import { Skeleton } from "boneyard-js/react";
import { BONE_NAMES } from "./skeleton-names";
import type { FilingPipelineProgress } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Form345PipelineProgress } from "@/routes/company/[cik]/hooks/use-form345-pipeline";
import { FILINGS_ANALYSIS_PROGRESS_FIXTURE } from "./filings-analysis-progress-fixture";

type FilingsAnalysisProgressProps = {
  progress: FilingPipelineProgress;
  onViewFailed?: () => void;
};

function formatProgressMessage(progress: FilingPipelineProgress): string {
  if (progress.phase === "loading-status") {
    return "Checking stored filings…";
  }

  if (progress.phase === "storing") {
    return [
      `Downloading 8-K and 10-K filings — ${progress.stored} stored`,
      progress.storing > 0 ? `${progress.storing} downloading` : null,
      progress.storeQueued > 0 ? `${progress.storeQueued} queued` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (progress.phase === "analyzing") {
    return [
      `Analyzing 8-K and 10-K filings — ${progress.analyzed} complete`,
      progress.analyzing > 0 ? `${progress.analyzing} analyzing` : null,
      progress.analyzeQueued > 0 ? `${progress.analyzeQueued} queued` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return `Processing 8-K and 10-K filings — ${progress.analyzed} complete`;
}

function FilingsAnalysisProgressContent({
  progress,
  onViewFailed,
}: FilingsAnalysisProgressProps) {
  const message = formatProgressMessage(progress);

  return (
    <p className="mt-2 text-sm text-emerald-800">
      {message}
      {progress.error > 0 ? (
        <>
          {message.length > 0 ? ", " : ""}
          {onViewFailed ? (
            <button
              type="button"
              onClick={onViewFailed}
              className="font-medium text-red-700 underline decoration-red-700/40 underline-offset-2 hover:text-red-800"
            >
              {progress.error} failed
            </button>
          ) : (
            <span className="font-medium text-red-700">{progress.error} failed</span>
          )}
        </>
      ) : null}
      .
    </p>
  );
}

const FILINGS_ANALYSIS_PROGRESS_FIXTURE_ELEMENT = (
  <FilingsAnalysisProgressContent progress={FILINGS_ANALYSIS_PROGRESS_FIXTURE} />
);

export function FilingsAnalysisProgress({ progress, onViewFailed }: FilingsAnalysisProgressProps) {
  if (!progress.active && progress.error === 0) return null;

  const isWorking = progress.phase === "storing" || progress.phase === "analyzing";

  return (
    <Skeleton
      name={BONE_NAMES.filingsAnalysisProgress}
      loading={isWorking}
      animate="pulse"
      color="rgba(16, 185, 129, 0.12)"
      fixture={FILINGS_ANALYSIS_PROGRESS_FIXTURE_ELEMENT}
      fallback={<FilingsAnalysisProgressContent progress={progress} onViewFailed={onViewFailed} />}
    >
      <FilingsAnalysisProgressContent progress={progress} onViewFailed={onViewFailed} />
    </Skeleton>
  );
}

type Form345FilingsProgressProps = {
  progress: Form345PipelineProgress;
};

function formatForm345ProgressMessage(progress: Form345PipelineProgress): string {
  if (progress.phase === "loading-status") {
    return "Checking stored Form 3/4/5 filings…";
  }

  if (progress.phase === "ingesting") {
    return [
      `Ingesting Form 3/4/5 filings — ${progress.ingested} complete`,
      progress.ingesting > 0 ? `${progress.ingesting} ingesting` : null,
      progress.queued > 0 ? `${progress.queued} queued` : null,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return `Form 3/4/5 filings — ${progress.ingested} ingested`;
}

export function Form345FilingsProgress({ progress }: Form345FilingsProgressProps) {
  if (!progress.active && progress.error === 0) return null;

  const message = formatForm345ProgressMessage(progress);

  return (
    <p className="mt-2 text-sm text-sky-800">
      {message}
      {progress.error > 0 ? (
        <>
          {message.length > 0 ? ", " : ""}
          <span className="font-medium text-red-700">{progress.error} failed</span>
        </>
      ) : null}
      .
    </p>
  );
}
