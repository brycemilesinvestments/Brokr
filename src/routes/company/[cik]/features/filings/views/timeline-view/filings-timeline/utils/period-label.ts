import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/lib/timeline";

export function periodLabel(filing: TimelineFiling): string | null {
  if (filing.fiscalPeriod?.quarter === "FY") return `FY${filing.fiscalPeriod.fiscalYear}`;
  if (filing.fiscalPeriod?.quarter) {
    return `${filing.fiscalPeriod.quarter} FY${filing.fiscalPeriod.fiscalYear}`;
  }
  return null;
}
