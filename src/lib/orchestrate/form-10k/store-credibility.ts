import type { ProseSections } from "@/lib/edgar/discovery";
import type { ManagementCredibilityRecord } from "@/lib/agent/form-10k";

function yearFromDate(dateString: string): number {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return date.getUTCFullYear();
}

/** K9 — Store prior-year MD&A outlook language for later credibility comparison. */
export function storeManagementCredibility(input: {
  accession: string;
  periodEnd: string;
  sections: ProseSections;
}): ManagementCredibilityRecord {
  const mdaText = input.sections.mda?.text?.trim() ?? null;
  const riskText = input.sections.risk_factors?.text?.trim() ?? null;

  return {
    fiscalYear: yearFromDate(input.periodEnd),
    periodEnd: input.periodEnd,
    accession: input.accession,
    mdaOutlookText: mdaText,
    riskFactorSummary: riskText ? riskText.slice(0, 2000) : null,
    storedAt: new Date().toISOString(),
  };
}
