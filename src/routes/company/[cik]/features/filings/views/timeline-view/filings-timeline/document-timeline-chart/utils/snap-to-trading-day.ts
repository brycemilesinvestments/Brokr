/** Max calendar gap allowed when snapping to the first/last session in the series. */
const MAX_EDGE_SNAP_MS = 10 * 86_400_000;

function parseUtcDate(date: string): number | null {
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

/**
 * Map a calendar date to the nearest trading day in the quote series.
 * Prefers the first session on or after the date; otherwise the last session before it.
 * Returns null when the date is too far outside the available quote range (avoids
 * clustering misplaced markers on the first or last chart date).
 */
export function snapToTradingDay(
  date: string,
  quoteDates: string[],
): string | null {
  if (quoteDates.length === 0) return null;

  const target = parseUtcDate(date);
  if (target == null) return null;

  const firstDate = quoteDates[0];
  const lastDate = quoteDates[quoteDates.length - 1];
  const firstTime = parseUtcDate(firstDate);
  const lastTime = parseUtcDate(lastDate);
  if (firstTime == null || lastTime == null) return null;

  let onOrAfter: string | null = null;
  let before: string | null = null;

  for (const quoteDate of quoteDates) {
    const time = parseUtcDate(quoteDate);
    if (time == null) continue;

    if (time >= target) {
      onOrAfter = quoteDate;
      break;
    }
    before = quoteDate;
  }

  const snapped = onOrAfter ?? before;
  if (!snapped) return null;

  if (snapped === firstDate && target < firstTime && firstTime - target > MAX_EDGE_SNAP_MS) {
    return null;
  }

  if (snapped === lastDate && target > lastTime && target - lastTime > MAX_EDGE_SNAP_MS) {
    return null;
  }

  return snapped;
}
