import type { ProseSections } from "@/lib/edgar/discovery/types";

/** Shared empty prose sections record for all section keys. */
export function emptyProseSections(): ProseSections {
  return {
    business: null,
    risk_factors: null,
    mda: null,
    financials: null,
    notes: null,
    auditor: null,
    controls: null,
    legal: null,
    subsequent_events: null,
    revenue_concentration: null,
    form_8k_body: null,
    exhibit_99_1: null,
  };
}
