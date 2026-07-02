import {
  BALANCE_SHEET,
  CASH_FLOW,
  INCOME_STATEMENT,
  SHARE_DATA,
} from "@/lib/edgar/xbrl/filter-financial-facts";

export const ALL_WHITELISTED_CONCEPTS = [
  ...INCOME_STATEMENT,
  ...BALANCE_SHEET,
  ...CASH_FLOW,
  ...SHARE_DATA,
] as const;

export type WhitelistedConcept = (typeof ALL_WHITELISTED_CONCEPTS)[number];

const DEI_CONCEPTS = new Set<string>(SHARE_DATA);

export function taxonomyForConcept(concept: string): string[] {
  if (DEI_CONCEPTS.has(concept)) {
    return ["dei", "us-gaap", "ifrs-full"];
  }
  return ["us-gaap", "ifrs-full", "dei"];
}

export const QUARTER_FPS = ["Q1", "Q2", "Q3", "Q4"] as const;
