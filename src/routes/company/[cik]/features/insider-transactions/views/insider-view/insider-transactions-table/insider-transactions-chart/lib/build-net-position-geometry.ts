import type { NetPositionBarGeometry, NetPositionRow } from "../types";

function logScaledHalfFraction(absNet: number, maxAbsNet: number): number {
  if (absNet <= 0 || maxAbsNet <= 0) return 0;
  if (absNet >= maxAbsNet) return 1;

  return Math.log10(absNet) / Math.log10(maxAbsNet);
}

export function buildNetPositionGeometry(rows: NetPositionRow[]): NetPositionBarGeometry[] {
  const maxAbsNet = rows.reduce((max, row) => Math.max(max, Math.abs(row.netShares)), 0);

  return rows.map((row) => {
    const absNet = Math.abs(row.netShares);
    const barHalfFraction = logScaledHalfFraction(absNet, maxAbsNet);
    const isAcquired = row.netShares > 0;

    return {
      owner: row.owner,
      ownerType: row.ownerType,
      netShares: row.netShares,
      transactions: row.transactions,
      direction: isAcquired ? "acquired" : "disposed",
      barHalfFraction,
    };
  });
}
