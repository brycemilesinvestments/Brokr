import type { FredTimelineEvent } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { TWO_MONTH_IMPACT_TRADING_DAYS } from "./compute-price-impact";

const LEAD_BUFFER_MS = 30 * 86_400_000;
/** ~42 trading days in calendar time, plus a small cushion for holidays. */
const IMPACT_TAIL_BUFFER_MS = (TWO_MONTH_IMPACT_TRADING_DAYS + 10) * 86_400_000;

function collectEventTimestamps(
  filings: TimelineFiling[],
  fredEvents: FredTimelineEvent[],
): number[] {
  const timestamps: number[] = [];

  for (const filing of filings) {
    const time = Date.parse(`${filing.timelineDate}T00:00:00Z`);
    if (!Number.isNaN(time)) timestamps.push(time);
  }

  for (const event of fredEvents) {
    const time = Date.parse(`${event.observationDate}T00:00:00Z`);
    if (!Number.isNaN(time)) timestamps.push(time);
  }

  return timestamps;
}

export function buildStockHistoryRange(
  filings: TimelineFiling[],
  fredEvents: FredTimelineEvent[] = [],
) {
  const now = Math.floor(Date.now() / 1000);
  let period1 = now - 365 * 24 * 60 * 60;
  let period2 = now;

  const eventTimestamps = collectEventTimestamps(filings, fredEvents);
  if (eventTimestamps.length > 0) {
    const earliest = Math.min(...eventTimestamps);
    const latest = Math.max(...eventTimestamps);
    period1 = Math.floor((earliest - LEAD_BUFFER_MS) / 1000);
    period2 = Math.max(now, Math.floor((latest + IMPACT_TAIL_BUFFER_MS) / 1000));
  }

  return { period1, period2 };
}
