import type { Filing } from "@/routes/company/[cik]/types";

export function uniqueValues(filings: Filing[], getValue: (filing: Filing) => string): string[] {
  return [...new Set(filings.map(getValue))];
}

export function initialSelected(filings: Filing[], getValue: (filing: Filing) => string): Set<string> {
  return new Set(uniqueValues(filings, getValue));
}
