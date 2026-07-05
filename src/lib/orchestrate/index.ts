export {
  analyzeCompanyQuarter,
  isValidCik,
  normalizeCik,
} from "@/lib/orchestrate/analyze";
export type { AnalyzeQuarterInput, AnalyzeQuarterResult, OrchestrateDeps } from "@/lib/orchestrate/analyze";

export {
  compileCompanyAnalysisIfNeeded,
  getStoredCompanyAnalysisByCik,
  maybeCompileCompanyAnalysis,
} from "@/lib/orchestrate/compile-company-analysis";
export type { CompileCompanyAnalysisResult } from "@/lib/orchestrate/compile-company-analysis";

export { buildSourceFingerprint } from "@/lib/orchestrate/company-analysis-fingerprint";

export {
  analyzeCompany,
  analyzeCompanyOffline,
  priceBarsFromYahooFixture,
} from "@/lib/orchestrate/analyze-company";
export type {
  AnalyzeCompanyDeps,
  AnalyzeCompanyOfflineFixtures,
} from "@/lib/orchestrate/analyze-company";

export {
  detectCrossLayerAnomalies,
  buildAnomalyExcerpt,
  isChartMarkable,
} from "@/lib/orchestrate/cross-anomalies";

export { buildCoverageReport } from "@/lib/orchestrate/coverage-report";

export {
  analyzeFilingDiscovery,
  createSignalCache,
  parseFilingDiscoveryConfig,
} from "@/lib/orchestrate/filing-discovery";
export type { FilingDiscoveryOutput } from "@/lib/orchestrate/filing-discovery";

export {
  validateMasterContract,
  collectUnsatisfied,
} from "@/lib/orchestrate/contract";

export type {
  AnalyzeCompanyInput,
  CompanyAnalysisOutput,
  CrossLayerAnomaly,
  AnomalyExplanation,
  CoverageReport,
  MasterContractValidation,
  MasterOrchestrationConfig,
} from "@/lib/orchestrate/types";

export {
  DEFAULT_MASTER_MAX_ITERATIONS,
  DEFAULT_MASTER_MAX_COST_USD,
  parseMasterConfigFromEnv,
} from "@/lib/orchestrate/types";

export {
  wireHandlers,
  analyzeCompanyQuarterOffline,
} from "@/lib/orchestrate/wire-handlers";
export type { WireHandlersDeps } from "@/lib/orchestrate/wire-handlers";

export {
  buildCompanyTimeSeries,
  buildTimeSeriesFromFacts,
} from "@/lib/orchestrate/build-time-series";
export type { BuildTimeSeriesResult } from "@/lib/orchestrate/build-time-series";

export { fetchLatestIxbrlFacts } from "@/lib/orchestrate/fetch-ixbrl-facts";

export { runForm8kSync } from "@/lib/orchestrate/form-8k";
export type { Form8kSyncResult } from "@/lib/orchestrate/form-8k";
