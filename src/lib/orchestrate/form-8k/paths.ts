/** Format ISO date (YYYY-MM-DD) as MM-DD-YY for storage filenames. */
export function formatFormStorageDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  const yy = year.slice(-2);
  return `${month}-${day}-${yy}`;
}

export function form8kEventDate(filing: { reportDate?: string; filingDate: string }): string {
  return filing.reportDate || filing.filingDate;
}

export function form8kStoragePath(
  companyId: number,
  eventDate: string,
  suffix?: string,
): string {
  const formatted = formatFormStorageDate(eventDate);
  const base = `documents/8-K/${companyId}/8-K ${formatted}`;
  return suffix ? `${base}-${suffix}.htm` : `${base}.htm`;
}

export const EDGAR_BUCKET = "edgar";
