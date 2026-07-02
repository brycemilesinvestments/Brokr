import type { FredTimelineEvent } from "@/lib/fred/types";
import type { FiscalYearGroup, TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export type ViewMode = "chronological" | "fiscal-year";

export type DocumentTimelineItem =
  | { kind: "filing"; sortDate: string; filing: TimelineFiling }
  | { kind: "fred"; sortDate: string; event: FredTimelineEvent };

export type FilingsTimelineProps = {
  cik: string;
  timeline: TimelineFiling[];
  fiscalYearEnd?: string;
  ticker?: string;
  enabled?: boolean;
};

export type TimelineEntryProps = {
  cik: string;
  filing: TimelineFiling;
};

export type FredTimelineEntryProps = {
  event: FredTimelineEvent;
};

export type FiscalYearSectionProps = {
  cik: string;
  group: FiscalYearGroup;
};
