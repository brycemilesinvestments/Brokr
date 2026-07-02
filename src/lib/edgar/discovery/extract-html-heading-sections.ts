import type { Form10kSectionKey } from "@/lib/edgar/discovery/types";

const HTML_HEADING_MIN_CHARS = 200;
const HTML_HEADING_MAX_CHARS = 150_000;
export const IXBRL_SECTION_THRESHOLD = 3;

/** Narrative sections that trigger Path B when fewer than 3 are found via iXBRL. */
const NARRATIVE_SECTION_KEYS: Form10kSectionKey[] = [
  "business",
  "risk_factors",
  "mda",
];

export type HtmlItemHeading = {
  sectionType: Form10kSectionKey | "unresolved_staff_comments" | "properties" | "market_risk";
  pattern: RegExp;
  skip?: boolean;
};

/** SEC Item heading patterns for Path B HTML fallback (case-insensitive). */
const HTML_ITEM_HEADINGS: HtmlItemHeading[] = [
  {
    sectionType: "business",
    pattern: /\bITEM\s+1(?:\.|\s)(?!\s*A|\s*B\b)/i,
  },
  { sectionType: "risk_factors", pattern: /\bITEM\s+1A\b/i },
  { sectionType: "unresolved_staff_comments", pattern: /\bITEM\s+1B\b/i, skip: true },
  { sectionType: "properties", pattern: /\bITEM\s+2\b/i, skip: true },
  { sectionType: "legal", pattern: /\bITEM\s+3\b/i },
  { sectionType: "mda", pattern: /\bITEM\s+7(?:\.|\s)(?!\s*A\b)/i },
  { sectionType: "market_risk", pattern: /\bITEM\s+7A\b/i, skip: true },
  { sectionType: "financials", pattern: /\bITEM\s+8\b/i },
  { sectionType: "controls", pattern: /\bITEM\s+9A\b/i },
  { sectionType: "subsequent_events", pattern: /\bITEM\s+15\b/i },
];

export type HtmlHeadingMatch = {
  sectionType: Form10kSectionKey;
  index: number;
  matchLength: number;
};

function isExtractableSectionType(
  value: HtmlItemHeading["sectionType"],
): value is Form10kSectionKey {
  return value !== "unresolved_staff_comments" && value !== "properties" && value !== "market_risk";
}

export type HtmlHeadingSection = {
  sectionType: Form10kSectionKey;
  text: string;
  charCount: number;
};

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

/** Build searchable plain text from HTML while preserving block boundaries. */
function htmlToSearchableText(html: string): string {
  const withBreaks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|td|th|tr|li|h[1-6])>/gi, "\n");
  return stripHtml(withBreaks);
}

function collectItemBoundaries(text: string): HtmlHeadingMatch[] {
  const allBoundaries: HtmlHeadingMatch[] = [];

  for (const heading of HTML_ITEM_HEADINGS) {
    if (!isExtractableSectionType(heading.sectionType)) continue;
    const regex = new RegExp(heading.pattern.source, heading.pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      allBoundaries.push({
        sectionType: heading.sectionType,
        index: match.index,
        matchLength: match[0].length,
      });
    }
  }

  return allBoundaries.toSorted((a, b) => a.index - b.index);
}

/** Extract prose sections between consecutive Item headings. */
export function extractHtmlHeadingSections(html: string): HtmlHeadingSection[] {
  const text = htmlToSearchableText(html);
  const allBoundaries = collectItemBoundaries(text);
  if (allBoundaries.length === 0) return [];

  const sections: HtmlHeadingSection[] = [];
  const resolved = new Set<Form10kSectionKey>();

  for (const sectionType of new Set(allBoundaries.map((b) => b.sectionType))) {
    const typeHeadings = allBoundaries.filter((b) => b.sectionType === sectionType);

    for (const heading of typeHeadings) {
      if (resolved.has(sectionType)) break;

      const start = heading.index + heading.matchLength;
      const nextBoundary = allBoundaries.find((b) => b.index > heading.index);
      const end = nextBoundary?.index ?? text.length;
      let sectionText = text.slice(start, end).trim();

      if (sectionText.length < HTML_HEADING_MIN_CHARS) continue;
      if (sectionText.length > HTML_HEADING_MAX_CHARS) {
        sectionText = sectionText.slice(0, HTML_HEADING_MAX_CHARS);
      }

      sections.push({
        sectionType,
        text: sectionText,
        charCount: sectionText.length,
      });
      resolved.add(sectionType);
    }
  }

  return sections;
}

export function countNarrativeIxbrlSections(
  sections: Partial<Record<Form10kSectionKey, unknown>>,
): number {
  return NARRATIVE_SECTION_KEYS.filter((key) => sections[key] != null).length;
}
