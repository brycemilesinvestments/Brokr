"use client";

import { useLayoutEffect, useRef } from "react";
import type { TimelineEvent } from "../types";
import { formatEventDate, formatPriceImpact } from "../utils/format-event-date";
import { scrollItemIntoContainer } from "../utils/scroll-item-into-container";
import { navigateToEventDetail } from "../utils/navigate-event-detail";
import { ChevronRightIcon } from "./chevron-right-icon";

type EventImpactListProps = {
  cik: string;
  events: TimelineEvent[];
  activeEventId: string | null;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
};

export function EventImpactList({
  cik,
  events,
  activeEventId,
  selectedEventId,
  onSelectEvent,
  onHoverEvent,
}: EventImpactListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    if (!selectedEventId) return;

    let frameId = 0;

    const scrollToSelected = () => {
      const container = listRef.current;
      const selectedItem = itemRefs.current.get(selectedEventId);
      if (!container || !selectedItem) return false;

      scrollItemIntoContainer(container, selectedItem);
      return true;
    };

    if (!scrollToSelected()) {
      frameId = requestAnimationFrame(scrollToSelected);
    }

    return () => cancelAnimationFrame(frameId);
  }, [selectedEventId, events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-center text-sm text-zinc-500">
          No events with 2-month price impact in this range.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="min-h-0 flex-1 overflow-y-auto px-1 py-2 pl-1 pr-2"
    >
      {events.map((event) => {
        const isActive = activeEventId === event.id;
        const isSelected = selectedEventId === event.id;
        const impactPositive = event.priceImpact >= 0;

        return (
          <div
            key={event.id}
            ref={(node) => {
              if (node) {
                itemRefs.current.set(event.id, node);
              } else {
                itemRefs.current.delete(event.id);
              }
            }}
            onMouseEnter={() => onHoverEvent(event.id)}
            onMouseLeave={() => onHoverEvent(null)}
            className={`flex w-full items-center gap-1 rounded-[9px] px-1 py-1 transition-colors ${
              isSelected
                ? "bg-zinc-100 ring-1 ring-inset ring-zinc-200"
                : isActive
                  ? "bg-zinc-50"
                  : "bg-transparent hover:bg-zinc-50"
            }`}
          >
            <button
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelectEvent(event.id)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-[7px] px-1.5 py-1 text-left"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-zinc-700">
                    {event.categoryLabel}
                  </span>
                  <span className="font-mono text-[9.5px] text-zinc-400">
                    {formatEventDate(event.eventDate)}
                  </span>
                </div>
                <div className="truncate text-[11.5px] text-zinc-600">{event.description}</div>
              </div>
              <span
                className={`shrink-0 font-mono text-[13px] font-bold ${
                  impactPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatPriceImpact(event.priceImpact)}
              </span>
            </button>
            {isSelected ? (
              <button
                type="button"
                aria-label={`Open ${event.kind === "filing" ? "filing" : "FRED"} details`}
                onClick={() => navigateToEventDetail(cik, event)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-800"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
