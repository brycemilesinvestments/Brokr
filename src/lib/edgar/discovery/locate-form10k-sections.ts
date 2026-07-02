import type { XbrlFact } from "@/lib/edgar/xbrl/types";
import {
  AUDITOR_NAME_CONCEPTS,
  PROSE_TEXT_BLOCK_CONCEPTS,
} from "@/lib/edgar/discovery/constants";
import {
  extractHtmlHeadingSections,
  countNarrativeIxbrlSections,
  IXBRL_SECTION_THRESHOLD,
} from "@/lib/edgar/discovery/extract-html-heading-sections";
import type {
  Form10kSectionKey,
  ProseSection,
  ProseSectionKey,
  ProseSections,
  SectionCoverage,
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
      source: "ixbrl_textblock",
    };
  }
  return null;
}

function locateIxbrlSection(
  facts: XbrlFact[],
  key: ProseSectionKey,
): ProseSection | null {
  const concepts = PROSE_TEXT_BLOCK_CONCEPTS[key];
  const section = findTextBlock(facts, concepts);
  if (!section) return null;
  return { ...section, key };
}

function htmlSectionToProse(section: {
  sectionType: Form10kSectionKey;
  text: string;
  charCount: number;
}): ProseSection {
  return {
    key: section.sectionType,
    concept: `html:ITEM_${section.sectionType}`,
    taxonomy: "html",
    text: section.text,
    charCount: section.charCount,
    source: "html_heading_fallback",
  };
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

function countIxbrlSections(sections: Partial<ProseSections>): number {
  return countNarrativeIxbrlSections(sections);
}

/**
 * K1 — Two-path section extraction.
 * Path A: iXBRL TextBlock concepts. If >= 3 sections found, stop.
 * Path B: HTML Item heading fallback when Path A finds < 3 sections.
 */
export function locateForm10kSections(
  ixbrlFacts: XbrlFact[],
  html?: string | null,
): ProseSections {
  const fromIxbrl: Partial<ProseSections> = {};

  for (const key of FORM10K_SECTION_KEYS) {
    fromIxbrl[key] = locateIxbrlSection(ixbrlFacts, key);
  }

  const ixbrlCount = countIxbrlSections(fromIxbrl);
  const useHtmlFallback = ixbrlCount < IXBRL_SECTION_THRESHOLD && Boolean(html?.trim());
  const fromHtml = useHtmlFallback ? extractHtmlHeadingSections(html!) : [];

  const htmlByKey = new Map<Form10kSectionKey, ProseSection>();
  for (const section of fromHtml) {
    if (!htmlByKey.has(section.sectionType)) {
      htmlByKey.set(section.sectionType, htmlSectionToProse(section));
    }
  }

  function resolve(key: Form10kSectionKey): ProseSection | null {
    return fromIxbrl[key] ?? htmlByKey.get(key) ?? null;
  }

  return {
    business: resolve("business"),
    risk_factors: resolve("risk_factors"),
    mda: resolve("mda"),
    financials: resolve("financials"),
    notes: resolve("notes"),
    auditor: resolve("auditor"),
    controls: resolve("controls"),
    legal: resolve("legal"),
    subsequent_events: resolve("subsequent_events"),
    revenue_concentration: locateIxbrlSection(ixbrlFacts, "revenue_concentration"),
    form_8k_body: null,
    exhibit_99_1: null,
  };
}

/** Build K1 coverage report for sectionsPresent and per-section source tagging. */
export function buildSectionCoverage(sections: ProseSections): SectionCoverage {
  const sectionsPresent: ProseSectionKey[] = [];
  const sectionSources: SectionCoverage["sectionSources"] = {};

  for (const key of FORM10K_SECTION_KEYS) {
    const section = sections[key];
    if (!section) continue;
    sectionsPresent.push(key);
    sectionSources[key] = section.source;
  }

  return { sectionsPresent, sectionSources };
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
