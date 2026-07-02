import type { Form10kAction, Form10kState } from "@/lib/agent/form-10k/types";

/** Route the next 10-K agent action based on completion contract K1–K12. */
export function routeForm10kAction(state: Form10kState): Form10kAction {
  if (state.completed) return "complete";
  if (state.sections === null) return "ingest_sections";
  if (state.xbrlUniverse === null) return "extract_xbrl_universe";
  if (state.audited === null) return "tag_audit_status";
  if (!state.actionsTaken.includes("pair_annual_filings")) return "pair_annual_filings";

  const hasPair = state.pair !== null;
  if (hasPair && state.numeric === null) return "numeric_diff";
  if (hasPair && state.structural === null) return "structural_diff";
  if (hasPair && !state.actionsTaken.includes("check_prose_cache")) {
    return "check_prose_cache";
  }
  if (hasPair && state.prose === null && !state.cacheHit) return "prose_diff";
  if (state.credibility === null) return "store_credibility";
  if (state.eightKCrossRef === null) return "cross_ref_8k_events";
  if (state.auditorChange === null) return "detect_auditor_change";
  if (!state.pgvectorReady) return "confirm_pgvector_schema";
  return "complete";
}
