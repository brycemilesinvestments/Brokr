import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import {
  AUDITOR_NAME_CONCEPTS,
  PROSE_TEXT_BLOCK_CONCEPTS,
} from "@/lib/edgar/discovery/constants";
import type {
  Form10kSectionKey,
  ProseSection,
  ProseSectionKey,
  ProseSections,
} from "@/lib/edgar/discovery/types";

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
): Omit<ProseSection, "key"> | null {
  for (const concept of concepts) {
    const match = facts.find(
      (f) => f.concept === concept && f.value && f.value.trim().length > 0,
    );
    if (!match) continue;

    const text = stripHtml(match.value);
    if (text.length < 50) continue;

    return {
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

const FORM10K_SECTION_KEYS: Form10kSectionKey[] = [
  "business",
  "risk_factors",
  "mda",
  "financials",
  "notes",
  "auditor",
  "controls",
  "legal",
  "subsequent_events",
];

/** K1 — Locate all nine canonical 10-K prose sections from iXBRL text blocks. */
export function locateForm10kSections(ixbrlFacts: XbrlFact[]): ProseSections {
  const sections: Partial<ProseSections> = {};

  for (const key of FORM10K_SECTION_KEYS) {
    sections[key] = locateSection(ixbrlFacts, key);
  }

  return {
    business: sections.business ?? null,
    risk_factors: sections.risk_factors ?? null,
    mda: sections.mda ?? null,
    financials: sections.financials ?? null,
    notes: sections.notes ?? null,
    auditor: sections.auditor ?? null,
    controls: sections.controls ?? null,
    legal: sections.legal ?? null,
    subsequent_events: sections.subsequent_events ?? null,
    revenue_concentration: locateSection(ixbrlFacts, "revenue_concentration"),
    form_8k_body: null,
    exhibit_99_1: null,
  };
}

/** K11 — Extract auditor name from tagged facts or auditor section prose. */
export function extractAuditorName(ixbrlFacts: XbrlFact[], sections: ProseSections): string | null {
  for (const concept of AUDITOR_NAME_CONCEPTS) {
    const match = ixbrlFacts.find((f) => f.concept === concept && f.value?.trim());
    if (match) return match.value.trim();
  }

  const auditorText = sections.auditor?.text;
  if (!auditorText) return null;

  const patterns = [
    /independent registered public accounting firm[,:]?\s+([A-Za-z][A-Za-z0-9\s,&.()-]+)/i,
    /report of independent registered public accounting firm[,:]?\s+([A-Za-z][A-Za-z0-9\s,&.()-]+)/i,
    /audited by[,:]?\s+([A-Za-z][A-Za-z0-9\s,&.()-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = auditorText.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ").slice(0, 120);
    }
  }

  return null;
}
