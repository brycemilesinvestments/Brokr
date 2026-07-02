import type { FilingRef } from "@/lib/edgar";
import type { Earnings8kAuditEntry, Earnings8kCandidate } from "@/lib/guidance/types";

const EARNINGS_HINTS = [
  "earnings",
  "results",
  "financialresults",
  "ex99",
  "exhibit99",
  "pressrelease",
] as const;

const EARNINGS_ITEM_CODE = "2.02";

function hasItemCode(items: string | undefined, code: string): boolean {
  if (!items) return false;
  return items
    .split(",")
    .map((item) => item.trim())
    .includes(code);
}

function filingScore(filing: FilingRef): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (/^8-K/i.test(filing.form)) {
    score += 1;
    reasons.push("form_is_8k");
  }

  if (hasItemCode(filing.items, EARNINGS_ITEM_CODE)) {
    score += 1;
    reasons.push("item_2_02_results_of_operations");
  }

  const primary = (filing.primaryDocument ?? "").toLowerCase();
  if (primary.includes("99")) {
    score += 1;
    reasons.push("primary_document_has_99");
  }

  for (const hint of EARNINGS_HINTS) {
    if (primary.includes(hint)) {
      score += 1;
      reasons.push(`primary_document_has_${hint}`);
      break;
    }
  }

  return { score, reasons };
}

/**
 * G1 audit — every 8-K examined with accept/reject rationale (G4 transparency).
 */
export function audit_earnings_8k(filings: FilingRef[]): Earnings8kAuditEntry[] {
  const entries: Earnings8kAuditEntry[] = [];

  for (const filing of filings) {
    if (!/^8-K/i.test(filing.form)) continue;

    const { score, reasons } = filingScore(filing);
    const accepted = score >= 2;

    entries.push({
      accessionNumber: filing.accessionNumber,
      filingDate: filing.filingDate,
      form: filing.form,
      primaryDocument: filing.primaryDocument,
      accepted,
      score,
      reasons,
      rejectionReason: accepted
        ? undefined
        : score < 2
          ? "score_below_threshold (need form_is_8k + item_2_02 or exhibit/earnings hint)"
          : undefined,
    });
  }

  return entries.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
}

/**
 * G1 — Filter submissions to likely earnings-related 8-K filings.
 */
export function find_earnings_8k(filings: FilingRef[]): Earnings8kCandidate[] {
  const candidates: Earnings8kCandidate[] = [];

  for (const filing of filings) {
    const { score, reasons } = filingScore(filing);
    if (!/^8-K/i.test(filing.form) || score < 2) continue;

    candidates.push({
      cik: filing.cik,
      accessionNumber: filing.accessionNumber,
      filingDate: filing.filingDate,
      reportDate: filing.reportDate,
      form: filing.form,
      primaryDocument: filing.primaryDocument,
      score,
      reasons,
    });
  }

  return candidates.sort((a, b) => {
    const dateCmp = b.filingDate.localeCompare(a.filingDate);
    if (dateCmp !== 0) return dateCmp;

    const scoreCmp = b.score - a.score;
    if (scoreCmp !== 0) return scoreCmp;

    return a.accessionNumber.localeCompare(b.accessionNumber);
  });
}
