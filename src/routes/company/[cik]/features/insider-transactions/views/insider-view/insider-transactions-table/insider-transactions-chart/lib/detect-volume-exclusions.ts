import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";
import { bucketKey } from "../utils/bucket-keys";
import { formatShares } from "../utils/format-shares";
import { formatMonthLabel } from "../utils/format-month-label";

export type VolumeChartExclusion = {
  owner: string;
  monthKey: string;
  monthLabel: string;
  shares: number;
  sharesLabel: string;
};

const DOMINANCE_RATIO = 10;
const LARGE_SHARE_THRESHOLD = 5_000_000;

function isAdministrativeReclassification(transaction: InsiderTransaction): boolean {
  const code = transaction.transactionType?.trim().charAt(0).toUpperCase();
  const ownerIsTenPercent = transaction.ownerType?.includes("10%") ?? false;
  const shares = transaction.sharesTransacted ?? 0;

  if (shares < 1_000_000) return false;
  if (ownerIsTenPercent && (code === "J" || code === "G" || code === "C")) return true;
  return shares >= LARGE_SHARE_THRESHOLD;
}

export function detectVolumeChartExclusions(
  transactions: InsiderTransaction[],
): {
  included: InsiderTransaction[];
  exclusions: VolumeChartExclusion[];
} {
  const shareCounts = transactions
    .map((transaction) => transaction.sharesTransacted ?? 0)
    .filter((shares) => shares > 0)
    .toSorted((a, b) => a - b);

  const medianShares =
    shareCounts.length > 0
      ? shareCounts[Math.floor(shareCounts.length / 2)]
      : 0;

  const exclusions: VolumeChartExclusion[] = [];
  const excludedKeys = new Set<string>();

  for (const transaction of transactions) {
    const shares = transaction.sharesTransacted ?? 0;
    if (!shares) continue;

    const dominatesMedian =
      medianShares > 0 && shares >= medianShares * DOMINANCE_RATIO;
    const shouldExclude =
      isAdministrativeReclassification(transaction) ||
      (shares >= LARGE_SHARE_THRESHOLD && dominatesMedian);

    if (!shouldExclude) continue;

    const key = `${transaction.accessionNumber ?? "na"}-${transaction.lineNumber ?? 0}-${transaction.reportingOwner}-${transaction.transactionDate}`;
    if (excludedKeys.has(key)) continue;
    excludedKeys.add(key);

    const monthKey = bucketKey(transaction.transactionDate, "month");
    exclusions.push({
      owner: transaction.reportingOwner,
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      shares,
      sharesLabel: formatShares(shares),
    });
  }

  const included = transactions.filter((transaction) => {
    const key = `${transaction.accessionNumber ?? "na"}-${transaction.lineNumber ?? 0}-${transaction.reportingOwner}-${transaction.transactionDate}`;
    return !excludedKeys.has(key);
  });

  return { included, exclusions };
}

export function formatExclusionFootnote(exclusions: VolumeChartExclusion[]): string | null {
  if (exclusions.length === 0) return null;

  if (exclusions.length === 1) {
    const exclusion = exclusions[0];
    return `Excludes one ${exclusion.sharesLabel}-share administrative reclassification by ${exclusion.owner} (${exclusion.monthLabel}).`;
  }

  const summary = exclusions
    .map((exclusion) => `${exclusion.sharesLabel} shares (${exclusion.monthLabel})`)
    .join(", ");
  return `Excludes ${exclusions.length} administrative reclassifications: ${summary}.`;
}
