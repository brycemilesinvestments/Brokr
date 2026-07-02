import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

const BUFFER_MS = 30 * 86_400_000;

export function buildStockHistoryRange(eightKFilings: TimelineFiling[]) {
  const period2 = Math.floor(Date.now() / 1000);
  let period1 = period2 - 365 * 24 * 60 * 60;

  if (eightKFilings.length > 0) {
    const earliestFiling = Math.min(
      ...eightKFilings.map((filing) => Date.parse(`${filing.filingDate}T00:00:00Z`)),
    );
    period1 = Math.floor((earliestFiling - BUFFER_MS) / 1000);
  }

  return { period1, period2 };
}
