import type {
  FinancialStatementCategory,
  FinancialStatementRow,
} from "@/lib/edgar/xbrl/filter-financial-facts";

export type StatementGroup = {
  category: FinancialStatementCategory;
  periodKind: FinancialStatementRow["periodKind"];
  rows: FinancialStatementRow[];
  currentLabel?: string;
  priorLabel?: string;
};

export function groupStatementRows(rows: FinancialStatementRow[]): StatementGroup[] {
  const groups: StatementGroup[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.category === row.category && last.periodKind === row.periodKind) {
      last.rows.push(row);
      continue;
    }

    groups.push({
      category: row.category,
      periodKind: row.periodKind,
      rows: [row],
      currentLabel: row.currentPeriodLabel,
      priorLabel: row.priorPeriodLabel,
    });
  }

  return groups;
}
