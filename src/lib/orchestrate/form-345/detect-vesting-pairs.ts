import { randomUUID } from "node:crypto";
import type { ClassifiedTransactionRow, ParsedOwnershipRow } from "@/lib/orchestrate/form-345/types";

/** Tag Code A + Code F on same owner/security/date as one vesting event. */
export function detectVestingEventPairs(
  rows: ClassifiedTransactionRow[],
): ClassifiedTransactionRow[] {
  const pairKey = (row: ParsedOwnershipRow) =>
    [
      row.reportingOwnerCik ?? row.reportingOwnerName,
      row.securityTitle.toLowerCase(),
      row.transactionDate ?? "",
    ].join("|");

  const groups = new Map<string, ClassifiedTransactionRow[]>();

  for (const row of rows) {
    if (!row.transactionCode || !row.transactionDate) continue;
    if (row.transactionCode !== "A" && row.transactionCode !== "F") continue;

    const key = pairKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const result = rows.map((row) => ({ ...row }));

  for (const group of groups.values()) {
    const codes = new Set(group.map((row) => row.transactionCode));
    if (!codes.has("A") || !codes.has("F")) continue;

    const vestingEventId = randomUUID();
    for (const row of group) {
      const index = result.findIndex(
        (candidate) =>
          candidate.lineIndex === row.lineIndex &&
          candidate.transactionCode === row.transactionCode,
      );
      if (index >= 0) {
        result[index] = { ...result[index], vestingEventId };
      }
    }
  }

  return result;
}
