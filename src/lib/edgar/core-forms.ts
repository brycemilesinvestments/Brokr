/**
 * The Core Four — primary SEC forms for financial and governance analysis.
 *
 * 10-K  — Annual report (audited financials, MD&A, risk factors)
 * 10-Q  — Quarterly report (unaudited; Q1–Q3; Q4 rolls into 10-K)
 * 8-K   — Material event disclosures (earnings, M&A, exec changes)
 * DEF 14A — Proxy statement (exec comp, ownership, board composition)
 */

export type CoreFormCategory = "10-K" | "10-Q" | "8-K" | "DEF 14A";

export type CoreFormMeta = {
  category: CoreFormCategory;
  label: string;
  shortLabel: string;
  description: string;
  /** Sort weight within the same timeline date (lower = earlier). */
  sortWeight: number;
};

const CORE_FORM_PATTERNS: Array<{ pattern: RegExp; category: CoreFormCategory }> = [
  { pattern: /^10-K/i, category: "10-K" },
  { pattern: /^10-Q/i, category: "10-Q" },
  { pattern: /^8-K/i, category: "8-K" },
  { pattern: /^DEF\s*14A/i, category: "DEF 14A" },
  { pattern: /^DEFA14A/i, category: "DEF 14A" },
];

export const CORE_FORM_META: Record<CoreFormCategory, CoreFormMeta> = {
  "10-K": {
    category: "10-K",
    label: "10-K",
    shortLabel: "Annual",
    description: "Annual report — audited financials, MD&A, risk factors",
    sortWeight: 30,
  },
  "10-Q": {
    category: "10-Q",
    label: "10-Q",
    shortLabel: "Quarterly",
    description: "Quarterly report — unaudited interim financials (Q1–Q3)",
    sortWeight: 20,
  },
  "8-K": {
    category: "8-K",
    label: "8-K",
    shortLabel: "Event",
    description: "Material event — earnings, M&A, exec changes, guidance",
    sortWeight: 10,
  },
  "DEF 14A": {
    category: "DEF 14A",
    label: "DEF 14A",
    shortLabel: "Proxy",
    description: "Proxy statement — exec comp, ownership, board composition",
    sortWeight: 40,
  },
};

export const CORE_FORM_CATEGORIES: CoreFormCategory[] = ["10-K", "10-Q", "8-K", "DEF 14A"];

export function isAmendment(formType: string): boolean {
  return /\/A$/i.test(formType.trim());
}

export function classifyCoreForm(formType: string): CoreFormCategory | null {
  const normalized = formType.trim();
  for (const { pattern, category } of CORE_FORM_PATTERNS) {
    if (pattern.test(normalized)) return category;
  }
  return null;
}

function isCoreForm(formType: string): boolean {
  return classifyCoreForm(formType) !== null;
}

function getCoreFormMeta(formType: string): CoreFormMeta | null {
  const category = classifyCoreForm(formType);
  return category ? CORE_FORM_META[category] : null;
}
