import type { FilingPipelineProgress } from "@/routes/company/[cik]/hooks/use-filing-pipeline";

export const FILINGS_ANALYSIS_PROGRESS_FIXTURE = {
  phase: "analyzing",
  total: 24,
  stored: 24,
  analyzed: 6,
  storing: 0,
  storeQueued: 0,
  analyzing: 4,
  analyzeQueued: 14,
  error: 0,
  active: true,
} as const satisfies FilingPipelineProgress;
