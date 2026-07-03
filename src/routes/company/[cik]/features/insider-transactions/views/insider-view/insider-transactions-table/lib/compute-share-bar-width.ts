export function computeShareBarWidth(
  shares: number,
  maxShares: number,
): number {
  if (shares <= 0 || maxShares <= 0) return 0;
  if (shares >= maxShares) return 100;

  const ratio = Math.log10(shares) / Math.log10(maxShares);
  return Math.min(100, Math.max(0, ratio * 100));
}

export function maxShareVolume(
  transactions: Array<{ sharesTransacted?: number }>,
): number {
  return transactions.reduce(
    (max, transaction) => Math.max(max, transaction.sharesTransacted ?? 0),
    0,
  );
}
