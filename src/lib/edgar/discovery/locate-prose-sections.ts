import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import { PROSE_TEXT_BLOCK_CONCEPTS } from "@/lib/edgar/discovery/constants";
import { emptyProseSections } from "@/lib/edgar/discovery/empty-prose-sections";
import type { ProseSection, ProseSectionKey, ProseSections } from "@/lib/edgar/discovery/types";

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function findTextBlock(
  facts: XbrlFact[],
  concepts: string[],
): ProseSection | null {
  for (const concept of concepts) {
    const match = facts.find(
      (f) => f.concept === concept && f.value && f.value.trim().length > 0,
    );
    if (!match) continue;

    const text = stripHtml(match.value);
    if (text.length < 50) continue;

    return {
      key: "mda",
      concept: match.concept,
      taxonomy: match.taxonomy,
      text,
      charCount: text.length,
    };
  }
  return null;
}

function locateSection(
  facts: XbrlFact[],
  key: ProseSectionKey,
): ProseSection | null {
  const concepts = PROSE_TEXT_BLOCK_CONCEPTS[key];
  const section = findTextBlock(facts, concepts);
  if (!section) return null;
  return { ...section, key };
}

/** D5 — Locate qualitative prose sections from XBRL text-block tags. */
export function locateProseSections(ixbrlFacts: XbrlFact[]): ProseSections {
  return {
    ...emptyProseSections(),
    mda: locateSection(ixbrlFacts, "mda"),
    risk_factors: locateSection(ixbrlFacts, "risk_factors"),
    revenue_concentration: locateSection(ixbrlFacts, "revenue_concentration"),
    subsequent_events: locateSection(ixbrlFacts, "subsequent_events"),
  };
}
