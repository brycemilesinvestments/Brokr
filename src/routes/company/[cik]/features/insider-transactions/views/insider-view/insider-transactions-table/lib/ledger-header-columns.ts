import type { ColumnKey } from "../types";

export type LedgerHeaderColumn = {
  label: string;
  align?: "left" | "right";
  filters: Array<{
    key: ColumnKey;
    label: string;
  }>;
};

export const LEDGER_HEADER_COLUMNS: LedgerHeaderColumn[] = [
  {
    label: "Date",
    filters: [{ key: "transactionDate", label: "Date" }],
  },
  {
    label: "Reporting owner",
    filters: [
      { key: "reportingOwner", label: "Owner" },
      { key: "ownerType", label: "Type of owner" },
    ],
  },
  {
    label: "Transaction",
    filters: [
      { key: "transactionType", label: "Code" },
      { key: "footnoteClassification", label: "Classification" },
      { key: "acquiredOrDisposed", label: "A/D" },
    ],
  },
  {
    label: "Shares",
    filters: [
      { key: "sharesTransacted", label: "Shares" },
      { key: "securityName", label: "Security" },
    ],
  },
  {
    label: "Owned after",
    align: "right",
    filters: [{ key: "sharesOwnedFollowing", label: "Owned after" }],
  },
  {
    label: "Form",
    align: "right",
    filters: [],
  },
];
