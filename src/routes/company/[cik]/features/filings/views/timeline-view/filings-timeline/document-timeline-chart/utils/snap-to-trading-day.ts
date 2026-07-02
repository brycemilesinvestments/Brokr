/**
 * Map a calendar date to the nearest trading day in the quote series.
 * Prefers the first session on or after the date; otherwise the last session before it.
 */
export function snapToTradingDay(
  date: string,
  quoteDates: string[],
): string | null {
  if (quoteDates.length === 0) return null;

  const target = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(target)) return null;

  let onOrAfter: string | null = null;
  let before: string | null = null;

  for (const quoteDate of quoteDates) {
    const time = Date.parse(`${quoteDate}T00:00:00Z`);
    if (Number.isNaN(time)) continue;

    if (time >= target) {
      onOrAfter = quoteDate;
      break;
    }
    before = quoteDate;
  }

  return onOrAfter ?? before;
}
