/** ~21 trading days per calendar month × 2 months */
export const TWO_MONTH_IMPACT_TRADING_DAYS = 42;

export function getDateAfterTradingDays(
  snappedDate: string,
  quoteDates: string[],
  tradingDays = TWO_MONTH_IMPACT_TRADING_DAYS,
): string | null {
  const index = quoteDates.indexOf(snappedDate);
  if (index === -1) return null;

  const targetIndex = index + tradingDays;
  if (targetIndex >= quoteDates.length) return null;

  return quoteDates[targetIndex] ?? null;
}

export function getCloseAfterTradingDays(
  snappedDate: string,
  quoteDates: string[],
  closeByDate: Map<string, number>,
  tradingDays = TWO_MONTH_IMPACT_TRADING_DAYS,
): number | null {
  const targetDate = getDateAfterTradingDays(snappedDate, quoteDates, tradingDays);
  if (!targetDate) return null;

  return closeByDate.get(targetDate) ?? null;
}

export function computePriceImpactPercent(eventClose: number, futureClose: number): number {
  return ((futureClose - eventClose) / eventClose) * 100;
}
