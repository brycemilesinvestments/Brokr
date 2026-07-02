import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export type DocumentTimelineChartProps = {
  cik: string;
  timeline: TimelineFiling[];
  ticker?: string;
  enabled: boolean;
};

export type FilingMarker = {
  filing: TimelineFiling;
  filingDate: string;
  snappedDate: string;
  close: number;
};

export type StockHistoryResponse = {
  ticker: string;
  currency?: string;
  quotes: Array<{
    date: string;
    close: number;
  }>;
};
