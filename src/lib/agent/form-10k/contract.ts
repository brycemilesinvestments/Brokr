import type { Form10kOutput, Form10kState } from "@/lib/agent/form-10k/types";

const REQUIRED_KEYS: Array<keyof Form10kState> = [
  "sections",
  "xbrlUniverse",
  "audited",
  "credibility",
  "eightKCrossRef",
  "auditorChange",
];

/** Validate that all deterministic contract keys are satisfied. */
export function validateForm10kContract(state: Form10kState): string[] {
  const missing: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (state[key] === null || state[key] === undefined) {
      missing.push(key);
    }
  }

  if (!state.pgvectorReady) missing.push("pgvectorReady");
  if (state.pair !== null && state.numeric === null) missing.push("numeric");
  if (state.pair !== null && state.structural === null) missing.push("structural");
  if (state.pair !== null && state.prose === null && !state.cacheHit) missing.push("prose");

  return missing;
}

function isForm10kComplete(state: Form10kState): boolean {
  return validateForm10kContract(state).length === 0;
}

export function toForm10kOutput(state: Form10kState): Form10kOutput {
  if (!isForm10kComplete(state)) {
    throw new Error(`Form 10-K contract incomplete: ${validateForm10kContract(state).join(", ")}`);
  }

  return {
    cik: state.cik,
    accessionNumber: state.accessionNumber,
    form: state.form,
    sections: state.sections!,
    xbrlUniverse: state.xbrlUniverse!,
    audited: state.audited!,
    pair: state.pair,
    numeric: state.numeric,
    structural: state.structural,
    prose: state.prose,
    credibility: state.credibility,
    eightKCrossRef: state.eightKCrossRef,
    auditorChange: state.auditorChange,
    pgvectorReady: state.pgvectorReady,
    cacheHit: state.cacheHit,
    costUsd: state.costUsd,
    actionsTaken: state.actionsTaken,
  };
}
