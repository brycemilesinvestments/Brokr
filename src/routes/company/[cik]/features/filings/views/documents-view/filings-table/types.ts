import type { SortMode } from "@/routes/company/[cik]/components/column-filter";
import type { Filing } from "@/routes/company/[cik]/types";

export type FilingsTableProps = {
  cik: string;
  filings: Filing[];
  totalShown: number;
};

export type ColumnKey = "type" | "description" | "filingDate" | "accessionNumber";

export type ColumnConfig = {
  key: ColumnKey;
  label: string;
  getValue: (filing: Filing) => string;
  sortMode?: SortMode;
};
