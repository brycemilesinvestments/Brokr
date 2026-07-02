import { pairFilings } from "@/lib/filing-diff/pair_filings";
import type { FilingPair } from "@/lib/filing-diff/types";
import type { FilingRef } from "@/lib/edgar/types";

/** K4 — Pair a 10-K with the prior-year 10-K (or 10-Q with prior-year same quarter). */
export function pairAnnualFilings(
  cik: string,
  filings: FilingRef[],
  accessionNumber: string,
): FilingPair | null {
  return pairFilings(cik, filings, accessionNumber);
}
