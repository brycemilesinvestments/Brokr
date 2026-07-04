export function isIndexedFilingForm(formType: string): boolean {
  return /^8-K/i.test(formType) || /^10-K/i.test(formType) || /^DEF\s*14A/i.test(formType);
}

export function countIndexedFilings(filings: Array<{ type: string }>): number {
  return filings.filter((filing) => isIndexedFilingForm(filing.type)).length;
}
