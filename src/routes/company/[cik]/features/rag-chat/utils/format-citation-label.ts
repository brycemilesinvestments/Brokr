import type { RagCitation } from "../types";

const SECTION_LABELS: Record<string, string> = {
  mda: "MD&A",
  risk_factors: "Risk factors",
  business: "Business",
  financials: "Financials",
  controls: "Controls",
  legal: "Legal",
  subsequent_events: "Subsequent events",
};

export function formatCitationLabel(citation: RagCitation): string {
  const section =
    SECTION_LABELS[citation.sectionType] ??
    citation.sectionType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return citation.periodEnd ? `${section} · ${citation.periodEnd}` : section;
}
