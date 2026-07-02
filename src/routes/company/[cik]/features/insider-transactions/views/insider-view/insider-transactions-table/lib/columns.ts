import type { ColumnConfig } from "../types";

export const COLUMNS: ColumnConfig[] = [
  {
    key: "transactionDate",
    label: "Date",
    getValue: (transaction) => transaction.transactionDate,
    sortMode: "date",
  },
  {
    key: "reportingOwner",
    label: "Reporting owner",
    getValue: (transaction) => transaction.reportingOwner,
  },
  {
    key: "ownerType",
    label: "Type of owner",
    getValue: (transaction) => transaction.ownerType ?? "—",
  },
  {
    key: "transactionType",
    label: "Type",
    getValue: (transaction) => transaction.transactionType ?? "—",
  },
  {
    key: "acquiredOrDisposed",
    label: "A/D",
    getValue: (transaction) => transaction.acquiredOrDisposed ?? "—",
  },
  {
    key: "sharesTransacted",
    label: "Shares",
    getValue: (transaction) =>
      transaction.sharesTransacted !== undefined
        ? String(transaction.sharesTransacted)
        : "—",
  },
  {
    key: "sharesOwnedFollowing",
    label: "Shares owned after",
    getValue: (transaction) =>
      transaction.sharesOwnedFollowing !== undefined
        ? String(transaction.sharesOwnedFollowing)
        : "—",
  },
  {
    key: "securityName",
    label: "Security",
    getValue: (transaction) => transaction.securityName ?? "—",
  },
];
