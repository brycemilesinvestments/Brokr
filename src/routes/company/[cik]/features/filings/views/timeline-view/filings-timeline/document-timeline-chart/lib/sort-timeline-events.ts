import type { TimelineEvent } from "../types";

export type TimelineEventSort = "chronological" | "absolute-impact";

export function sortTimelineEvents(
  events: TimelineEvent[],
  sort: TimelineEventSort,
): TimelineEvent[] {
  if (sort === "absolute-impact") {
    return events.toSorted(
      (a, b) => Math.abs(b.priceImpact) - Math.abs(a.priceImpact),
    );
  }

  return events.toSorted((a, b) => b.eventDate.localeCompare(a.eventDate));
}
