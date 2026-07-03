/** Canonical boneyard skeleton names — one entry per distinct loading surface. */
export const BONE_NAMES = {
  filingRowAnalyzing: "filing-row-analyzing",
  filingRowQueued: "filing-row-queued",
  companyAnalysisPanel: "company-analysis-panel",
  filingsAnalysisProgress: "filings-analysis-progress",
  peersComparisonPanel: "peers-comparison-panel",
} as const;

export type BoneName = (typeof BONE_NAMES)[keyof typeof BONE_NAMES];
