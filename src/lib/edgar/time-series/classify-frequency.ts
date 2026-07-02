import type { CompanyFactUnit } from "@/lib/edgar/types";
import type { SeriesFrequency } from "@/lib/edgar/time-series/types";
import { QUARTER_FPS } from "@/lib/edgar/time-series/constants";

const ANNUAL_DURATION_MIN = 200;
const QUARTERLY_DURATION_MAX = 120;

function durationDays(point: CompanyFactUnit): number | undefined {
  if (!point.start || !point.end) return undefined;
  const days = (Date.parse(point.end) - Date.parse(point.start)) / 86_400_000;
  return Number.isFinite(days) ? days : undefined;
}

/** Classify a company-facts unit as annual or quarterly (mutually exclusive). */
export function classifyFrequency(point: CompanyFactUnit): SeriesFrequency | undefined {
  if (point.fp === "FY") return "annual";
  if (point.fp && (QUARTER_FPS as readonly string[]).includes(point.fp)) {
    return "quarterly";
  }

  const days = durationDays(point);
  if (days === undefined) {
    // Instant facts (balance sheet, shares) — fp drives classification.
    if (point.fp === "FY") return "annual";
    if (point.fp && (QUARTER_FPS as readonly string[]).includes(point.fp)) {
      return "quarterly";
    }
    return undefined;
  }

  if (days >= ANNUAL_DURATION_MIN) return "annual";
  if (days <= QUARTERLY_DURATION_MAX) return "quarterly";
  return undefined;
}
