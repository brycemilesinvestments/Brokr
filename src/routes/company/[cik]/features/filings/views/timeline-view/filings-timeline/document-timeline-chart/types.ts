import type { FredTimelineEvent } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export type DocumentTimelineChartProps = {
  cik: string;
  timeline: TimelineFiling[];
  fredEvents?: FredTimelineEvent[];
  ticker?: string;
  enabled: boolean;
};

export type FilingMarker = {
  kind: "filing";
  filing: TimelineFiling;
  eventDate: string;
  snappedDate: string;
  close: number;
};

export type FredMarker = {
  kind: "fred";
  event: FredTimelineEvent;
  eventDate: string;
  snappedDate: string;
  close: number;
};

export type TimelineMarker = FilingMarker | FredMarker;

export type StockHistoryResponse = {
  ticker: string;
  currency?: string;
  quotes: Array<{
    date: string;
    close: number;
  }>;
};
