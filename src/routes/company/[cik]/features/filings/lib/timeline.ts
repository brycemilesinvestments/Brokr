import {
  classifyCoreForm,
  CORE_FORM_META,
  isAmendment,
  type CoreFormCategory,
  type CoreFormMeta,
} from "@/lib/edgar/core-forms";
import type { Filing } from "@/routes/company/[cik]/types";
import type {
  FiscalPeriod,
  FiscalQuarter,
  FiscalYearGroup,
  TimelineFiling,
} from "@/routes/company/[cik]/features/filings/types";

const PERIOD_ENDED_RE =
  /(?:fiscal\s+year|quarterly\s+period|period)\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

function parseDescriptionReportDate(description: string): string | null {
  const match = description.match(PERIOD_ENDED_RE);
  if (!match) return null;
  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDate(parsed);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Derive fiscal year and quarter from a period-end report date and the
 * company's fiscal year end (MMDD, e.g. "0926" for Apple).
 */
function deriveFiscalPeriod(
  reportDate: string,
  formCategory: CoreFormCategory,
  fiscalYearEnd?: string,
): FiscalPeriod | null {
  const date = parseIsoDate(reportDate);
  if (!date) return null;

  if (formCategory === "10-K") {
    return { fiscalYear: resolveFiscalYear(date, fiscalYearEnd), quarter: "FY" };
  }

  if (formCategory !== "10-Q") return null;

  if (!fiscalYearEnd || fiscalYearEnd.length !== 4) {
    return { fiscalYear: date.getUTCFullYear(), quarter: null };
  }

  const fyEndMonth = parseInt(fiscalYearEnd.slice(0, 2), 10) - 1;
  const fyStartMonth = (fyEndMonth + 1) % 12;
  const reportMonth = date.getUTCMonth();

  let monthsFromStart = reportMonth - fyStartMonth;
  if (monthsFromStart < 0) monthsFromStart += 12;

  const quarterNum = Math.floor(monthsFromStart / 3) + 1;
  const quarter = (["Q1", "Q2", "Q3"] as const)[Math.min(quarterNum - 1, 2)] ?? "Q3";

  return {
    fiscalYear: resolveFiscalYear(date, fiscalYearEnd),
    quarter,
  };
}

function resolveFiscalYear(reportDate: Date, fiscalYearEnd?: string): number {
  if (!fiscalYearEnd || fiscalYearEnd.length !== 4) {
    return reportDate.getUTCFullYear();
  }

  const fyEndMonth = parseInt(fiscalYearEnd.slice(0, 2), 10) - 1;
  const fyEndDay = parseInt(fiscalYearEnd.slice(2, 4), 10);
  const year = reportDate.getUTCFullYear();
  const reportMonth = reportDate.getUTCMonth();
  const reportDay = reportDate.getUTCDate();

  // Fiscal year is labeled by the calendar year in which it ends.
  // Reports after the FY-end month belong to the FY ending next calendar year.
  if (reportMonth > fyEndMonth) {
    return year + 1;
  }

  // Reports in the FY-end month on or after the end day close out that fiscal year.
  if (reportMonth === fyEndMonth && reportDay >= fyEndDay) {
    return year;
  }

  return year;
}

/**
 * Pick the date that best represents when this filing belongs on the timeline.
 *
 * - 10-K / 10-Q → period end (report date)
 * - 8-K         → event date (report date), falling back to filing date
 * - DEF 14A     → annual meeting date (report date), falling back to filing date
 */
function getTimelineDate(
  category: CoreFormCategory,
  filingDate: string,
  reportDate: string | null,
): string {
  if (category === "10-K" || category === "10-Q") {
    return reportDate ?? filingDate;
  }

  if (category === "8-K" || category === "DEF 14A") {
    return reportDate || filingDate;
  }

  return filingDate;
}

function enrichFilingForTimeline(
  filing: Filing,
  options: {
    reportDate?: string | null;
    fiscalYearEnd?: string;
  } = {},
): TimelineFiling | null {
  const category = classifyCoreForm(filing.type);
  if (!category) return null;

  const meta = CORE_FORM_META[category];
  const reportDate =
    options.reportDate?.trim() ||
    parseDescriptionReportDate(filing.description) ||
    null;

  const timelineDate = getTimelineDate(category, filing.filingDate, reportDate);
  const fiscalPeriod =
    reportDate && (category === "10-K" || category === "10-Q")
      ? deriveFiscalPeriod(reportDate, category, options.fiscalYearEnd)
      : null;

  return {
    ...filing,
    category,
    meta,
    isAmendment: isAmendment(filing.type),
    timelineDate,
    reportDate,
    fiscalPeriod,
  };
}

/**
 * Compare two timeline filings for display order (newest first).
 *
 * Primary sort:   timeline date descending
 * Secondary sort: form weight within same date (10-K after 10-Q, etc.)
 * Tertiary sort:  amendments after originals
 * Final sort:     filing date descending as tiebreaker
 */
function compareTimelineFilings(a: TimelineFiling, b: TimelineFiling): number {
  const dateCmp = b.timelineDate.localeCompare(a.timelineDate);
  if (dateCmp !== 0) return dateCmp;

  const weightCmp = a.meta.sortWeight - b.meta.sortWeight;
  if (weightCmp !== 0) return weightCmp;

  if (a.isAmendment !== b.isAmendment) {
    return a.isAmendment ? 1 : -1;
  }

  return b.filingDate.localeCompare(a.filingDate);
}

/**
 * Compare filings for within-fiscal-year order (oldest period first).
 * Used when grouping: Q1 → Q2 → Q3 → 10-K, with 8-K and DEF 14A by date.
 */
function compareWithinFiscalYear(a: TimelineFiling, b: TimelineFiling): number {
  const quarterOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, FY: 4 };
  const aQ = a.fiscalPeriod?.quarter;
  const bQ = b.fiscalPeriod?.quarter;

  if (aQ && bQ && aQ !== bQ) {
    return quarterOrder[aQ] - quarterOrder[bQ];
  }

  const dateCmp = a.timelineDate.localeCompare(b.timelineDate);
  if (dateCmp !== 0) return dateCmp;

  return a.meta.sortWeight - b.meta.sortWeight;
}

export function buildCoreFourTimeline(
  filings: Filing[],
  options: {
    reportDatesByAccession?: Map<string, string>;
    fiscalYearEnd?: string;
  } = {},
): TimelineFiling[] {
  const { reportDatesByAccession, fiscalYearEnd } = options;
  const timeline: TimelineFiling[] = [];

  for (const filing of filings) {
    const reportDate = filing.accessionNumber
      ? reportDatesByAccession?.get(filing.accessionNumber)
      : undefined;

    const enriched = enrichFilingForTimeline(filing, { reportDate, fiscalYearEnd });
    if (enriched) timeline.push(enriched);
  }

  return timeline.sort(compareTimelineFilings);
}

function partitionTimelineByCategory(
  timeline: TimelineFiling[],
): Record<CoreFormCategory, TimelineFiling[]> {
  const result: Record<CoreFormCategory, TimelineFiling[]> = {
    "10-K": [],
    "10-Q": [],
    "8-K": [],
    "DEF 14A": [],
  };

  for (const filing of timeline) {
    result[filing.category].push(filing);
  }

  return result;
}
