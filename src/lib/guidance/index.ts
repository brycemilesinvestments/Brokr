export { find_earnings_8k, audit_earnings_8k } from "@/lib/guidance/find_earnings_8k";
export { extract_tagged_numbers } from "@/lib/guidance/extract_tagged_numbers";
export { check_cache } from "@/lib/guidance/check_cache";
export {
  extract_guidance,
  make_noop_guidance_extractor,
  latest_actual_by_metric,
} from "@/lib/guidance/extract_guidance";
export { write_cache } from "@/lib/guidance/write_cache";
export { track_vs_actual } from "@/lib/guidance/track_vs_actual";
export { route_guidance_action, run_guidance_router } from "@/lib/guidance/router";

export type {
  GuidanceMetric,
  Earnings8kCandidate,
  Earnings8kAuditEntry,
  TaggedNumber,
  GuidanceRange,
  GuidanceExtraction,
  GuidanceCacheRecord,
  GuidanceCache,
  GuidanceAiInput,
  GuidanceAiResult,
  GuidanceAiExtractor,
  CheckCacheResult,
  GuidanceVsActual,
  GuidanceRouterAction,
  GuidanceRouterState,
  GuidanceRouterInput,
  GuidanceRouterOutput,
} from "@/lib/guidance/types";
