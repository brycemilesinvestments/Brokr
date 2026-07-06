import { filingPagePath, resolveFilingPagePath } from "@/lib/edgar/constants";
import type { SeriesFrequency } from "@/lib/edgar/time-series";
import type { Filing } from "@/routes/company/[cik]/types";

const PERIOD_ENDED_RE =
  /(?:fiscal\s+year|quarterly\s+period|period)\s+ended\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

function parsePeriodEndFromDescription(description: string): string | null {
  const match = description.match(PERIOD_ENDED_RE);
  if (!match) return null;
  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function formMatchesFrequency(type: string, frequency: "quarterly" | "annual"): boolean {
  const normalized = type.toUpperCase();
  if (frequency === "annual") {
    return normalized.startsWith("10-K");
  }
  return normalized.startsWith("10-Q");
}

export function resolveMetricFilingHref(
  cik: string,
  filings: Filing[],
  periodEnd: string,
  frequency: "quarterly" | "annual",
): string | undefined {
  const candidates = filings.filter((filing) => formMatchesFrequency(filing.type, frequency));

  for (const filing of candidates) {
    const reportDate = parsePeriodEndFromDescription(filing.description);
    if (reportDate === periodEnd) {
      return resolveFilingPagePath(cik, filing);
    }
  }

  const sorted = candidates.toSorted((a, b) => b.filingDate.localeCompare(a.filingDate));
  const fallback = sorted.find((filing) => {
    const reportDate = parsePeriodEndFromDescription(filing.description);
    return reportDate ? reportDate <= periodEnd : filing.filingDate <= periodEnd;
  });

  if (!fallback) return undefined;
  return resolveFilingPagePath(cik, fallback);
}

export function resolveChartPointFilingHref(
  cik: string,
  filings: Filing[],
  point: {
    date: string;
    frequency: SeriesFrequency;
    accessionNumber?: string;
  },
): string | undefined {
  if (point.accessionNumber) {
    return filingPagePath(cik, point.accessionNumber);
  }

  const filingFrequency = point.frequency === "annual" ? "annual" : "quarterly";
  return resolveMetricFilingHref(cik, filings, point.date, filingFrequency);
}
