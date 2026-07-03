import type { SortMode } from "@/routes/company/[cik]/components/column-filter";
import type {
  FilingAnalysisProgress,
  FilingAnalysisStatus,
} from "@/routes/company/[cik]/hooks/use-filing-analysis-queue";
import type { Filing } from "@/routes/company/[cik]/types";

export type FilingsTableProps = {
  cik: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  getAnalysisStatus: (accessionNumber: string | undefined) => FilingAnalysisStatus;
  getAnalysisError: (accessionNumber: string | undefined) => string | null;
  analysisProgress: FilingAnalysisProgress;
};

export type ColumnKey = "type" | "description" | "filingDate" | "accessionNumber";

export type ColumnConfig = {
  key: ColumnKey;
  label: string;
  getValue: (filing: Filing) => string;
  sortMode?: SortMode;
};
