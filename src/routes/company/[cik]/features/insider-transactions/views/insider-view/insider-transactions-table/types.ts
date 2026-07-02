import type { SortMode } from "@/routes/company/[cik]/components/column-filter";
import type { InsiderTransaction } from "@/routes/company/[cik]/features/insider-transactions/types";

export type InsiderTransactionsTableProps = {
  transactions: InsiderTransaction[];
  totalShown: number;
  secUrl: string;
};

export type ColumnKey =
  | "transactionDate"
  | "reportingOwner"
  | "ownerType"
  | "transactionType"
  | "acquiredOrDisposed"
  | "sharesTransacted"
  | "sharesOwnedFollowing"
  | "securityName";

export type ColumnConfig = {
  key: ColumnKey;
  label: string;
  getValue: (transaction: InsiderTransaction) => string;
  sortMode?: SortMode;
};
