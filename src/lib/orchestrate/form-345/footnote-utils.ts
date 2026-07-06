import { createHash } from "node:crypto";
import type { FootnoteCitationEntry } from "@/lib/orchestrate/form-345/types";

export function normalizeFootnoteText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hashFootnoteText(text: string): string {
  const normalized = normalizeFootnoteText(text);
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

const PLAN_ADOPTION_PATTERNS = [
  /adopted(?:\s+by\s+the\s+reporting\s+person)?\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  /adopted\s+on\s+(\d{4}-\d{2}-\d{2})/i,
  /adopted\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
];

export function extractPlanAdoptionDate(footnoteText: string): string | null {
  for (const pattern of PLAN_ADOPTION_PATTERNS) {
    const match = footnoteText.match(pattern);
    if (!match?.[1]) continue;

    const parsed = Date.parse(match[1]);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
  }

  return null;
}

export function matchFootnoteCitation(
  footnoteText: string,
  citations: FootnoteCitationEntry[],
): FootnoteCitationEntry | undefined {
  for (const entry of citations) {
    const re = new RegExp(entry.pattern, "i");
    if (re.test(footnoteText)) {
      return entry;
    }
  }
  return undefined;
}
