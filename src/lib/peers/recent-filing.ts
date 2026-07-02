/** Months within which a peer must have filed to be considered active. */
export const RECENT_FILING_MONTHS = 24;

export function isFilingWithinMonths(
  filingDate: string,
  months: number,
  now: Date = new Date(),
): boolean {
  const filed = new Date(filingDate);
  if (Number.isNaN(filed.getTime())) return false;

  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return filed >= cutoff;
}
