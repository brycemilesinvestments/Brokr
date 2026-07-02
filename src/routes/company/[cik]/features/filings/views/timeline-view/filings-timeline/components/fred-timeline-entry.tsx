import { formatFredValue } from "@/lib/fred";
import { FRED_CATEGORY_STYLES } from "../constants";
import type { FredTimelineEntryProps } from "../types";
import { formatDisplayDate } from "../utils/format-display-date";

export function FredTimelineEntry({ event }: FredTimelineEntryProps) {
  const styles =
    FRED_CATEGORY_STYLES[event.category as keyof typeof FRED_CATEGORY_STYLES] ??
    FRED_CATEGORY_STYLES["Leading Indicators"];

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ring-2 ring-white ${styles.dot}`} />
        <div className="mt-1 w-px flex-1 bg-zinc-200 last:hidden" />
      </div>

      <div className="min-w-0 flex-1 -mt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${styles.badge}`}
          >
            FRED
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {event.seriesId}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles.badge}`}
          >
            {event.category}
          </span>
        </div>

        <p className="mt-1 text-sm font-medium text-zinc-800">{event.name}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>
            <span className="font-medium text-zinc-600">Release</span>{" "}
            {formatDisplayDate(event.observationDate)}
          </span>
          <span>
            <span className="font-medium text-zinc-600">Value</span>{" "}
            <span className="font-mono text-zinc-800">
              {formatFredValue(event.value, event.units)}
            </span>
          </span>
          {event.frequency ? (
            <span>
              <span className="font-medium text-zinc-600">Frequency</span> {event.frequency}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
