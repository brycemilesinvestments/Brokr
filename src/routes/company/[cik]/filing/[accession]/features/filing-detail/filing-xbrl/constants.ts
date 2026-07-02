import type { FinancialStatementCategory, FinancialStatementRow } from "@/lib/edgar/xbrl/filter-financial-facts";

export const CATEGORY_LABELS: Record<FinancialStatementCategory, string> = {
  income: "Income statement",
  balance: "Balance sheet",
  cash_flow: "Cash flow",
  shares: "Per share & share count",
};

export const PERIOD_LABELS: Record<FinancialStatementRow["periodKind"], string> = {
  quarter: "Quarter",
  ytd: "Year to date",
  instant: "Period end",
  cover: "Cover page",
};
