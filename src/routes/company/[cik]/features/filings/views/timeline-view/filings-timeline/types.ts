import type { FiscalYearGroup, TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

export type ViewMode = "chronological" | "fiscal-year";

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

export type FiscalYearSectionProps = {
  cik: string;
  group: FiscalYearGroup;
};
