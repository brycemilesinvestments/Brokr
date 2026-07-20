import type { SortMode } from "@/routes/company/[cik]/components/column-filter";
import type { FilingPipelineProgress } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { FilingWorkStatus } from "@/routes/company/[cik]/hooks/use-filing-pipeline";
import type { Filing } from "@/routes/company/[cik]/types";

export type FilingsTableProps = {
  cik: string;
  filings: Filing[];
  totalShown: number;
  hasMoreFilings?: boolean;
  isLoadingMore?: boolean;
  loadError?: string | null;
  loadRemainingFilings?: () => void;
  getAnalysisStatus: (accessionNumber: string | undefined) => FilingWorkStatus;
  getAnalysisError: (accessionNumber: string | undefined) => string | null;
  pipelineProgress: FilingPipelineProgress;
};

export type ColumnKey = "type" | "description" | "filingDate" | "accessionNumber";

export type ColumnConfig = {
  key: ColumnKey;
  label: string;
  getValue: (filing: Filing) => string;
  sortMode?: SortMode;
};
