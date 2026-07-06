import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";
import { isAnalyzableFiling } from "./is-analyzable-filing";
import { isForm345Filing } from "./is-form345-filing";

export const ANALYSIS_FILTER_OPTIONS = [
  "Analyzed",
  "Unavailable",
  "Queued",
  "Processing",
  "Failed",
  "Not started",
] as const;

export type AnalysisFilterOption = (typeof ANALYSIS_FILTER_OPTIONS)[number];

const STATUS_TO_FILTER_OPTION: Record<FilingWorkStatus, AnalysisFilterOption> = {
  complete: "Analyzed",
  unavailable: "Unavailable",
  "queued-store": "Queued",
  "queued-analyze": "Queued",
  storing: "Processing",
  analyzing: "Processing",
  error: "Failed",
  idle: "Not started",
};

export function getAnalysisFilterOption(
  filing: Filing,
  getAnalysisStatus: (accessionNumber: string | undefined) => FilingWorkStatus,
): AnalysisFilterOption | null {
  if (!isAnalyzableFiling(filing.type) && !isForm345Filing(filing.type)) return null;

  const status = getAnalysisStatus(filing.accessionNumber);
  return STATUS_TO_FILTER_OPTION[status];
}

export function matchesAnalysisFilter(
  filing: Filing,
  selected: Set<string>,
  getAnalysisStatus: (accessionNumber: string | undefined) => FilingWorkStatus,
): boolean {
  const option = getAnalysisFilterOption(filing, getAnalysisStatus);
  if (option === null) {
    return selected.size === ANALYSIS_FILTER_OPTIONS.length;
  }

  return selected.has(option);
}
