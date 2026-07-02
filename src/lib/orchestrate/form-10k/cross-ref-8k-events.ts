import type { ProseSections } from "@/lib/edgar/discovery";
import type { EightKCrossRefResult } from "@/lib/agent/form-10k";

export type Known8kEvent = {
  accessionNumber: string;
  eventType: string;
  eventDate: string;
  searchTerms?: string[];
};

const SECTION_SEARCH_ORDER: Array<{ key: keyof ProseSections; label: string }> = [
  { key: "notes", label: "notes" },
  { key: "financials", label: "financials" },
  { key: "mda", label: "mda" },
  { key: "risk_factors", label: "risk_factors" },
  { key: "subsequent_events", label: "subsequent_events" },
  { key: "legal", label: "legal" },
  { key: "business", label: "business" },
];

function buildTermPattern(terms: string[]): RegExp | null {
  const escaped = terms
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return null;
  return new RegExp(escaped.join("|"), "i");
}

function findEventInSections(
  sections: ProseSections,
  event: Known8kEvent,
): string | null {
  const terms = [
    ...(event.searchTerms ?? []),
    event.eventType.replace(/_/g, " "),
    event.eventType,
  ];
  const pattern = buildTermPattern(terms);
  if (!pattern) return null;

  for (const { key, label } of SECTION_SEARCH_ORDER) {
    const text = sections[key]?.text;
    if (!text) continue;

    if (pattern.test(text)) {
      return label;
    }
  }

  return null;
}

/** K10 — Link known 8-K events to 10-K section appearances. */
export function crossRef8kEvents(
  sections: ProseSections,
  events: Known8kEvent[],
): EightKCrossRefResult {
  const linked: EightKCrossRefResult["linked"] = [];
  const unlinked: EightKCrossRefResult["unlinked"] = [];

  for (const event of events) {
    const section = findEventInSections(sections, event);
    const entry = {
      eventAccession: event.accessionNumber,
      eventType: event.eventType,
      eventDate: event.eventDate,
      linkedSection: section,
      linked: section !== null,
    };

    if (section) linked.push(entry);
    else unlinked.push(entry);
  }

  return { linked, unlinked };
}
