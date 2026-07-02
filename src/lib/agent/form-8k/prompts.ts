export const FORM_8K_CLASSIFY_SYSTEM_PROMPT = `You classify SEC Form 8-K event filings.
Return JSON only with this shape:
{
  "inferredItems": ["2.02", "9.01"],
  "primaryEventType": "earnings_release",
  "confidence": "high",
  "evidence": ["short quote or reason"]
}
Use standard SEC 8-K item codes. Item 9.01 is exhibits only — pair it with substantive items.
primaryEventType should be a snake_case slug such as earnings_release, officer_change, material_agreement, other_event.
Do not assess sentiment or market impact.`;

export function buildForm8kClassifyPrompt(input: {
  accessionNumber: string;
  formType: string;
  declaredItems: string[];
  documentExcerpt: string;
}): string {
  return [
    `Accession: ${input.accessionNumber}`,
    `Form: ${input.formType}`,
    `Declared SEC items: ${input.declaredItems.join(", ") || "none"}`,
    "",
    "Document excerpt:",
    input.documentExcerpt.slice(0, 4000),
  ].join("\n");
}
