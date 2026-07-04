"use client";

import { cn } from "@/lib/utils";
import { NavIconClose } from "@/routes/company/[cik]/components/company-sidebar/company-sidebar-icons";
import type { TimelineEvent } from "../types";
import type { TimelineEventSort } from "../lib/sort-timeline-events";
import { EventImpactList } from "./event-impact-list";
import { EventSortOptions } from "./event-sort-options";

type EventImpactSidebarProps = {
  cik: string;
  events: TimelineEvent[];
  sort: TimelineEventSort;
  activeEventId: string | null;
  selectedEventId: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onSortChange: (sort: TimelineEventSort) => void;
  onSelectEvent: (eventId: string) => void;
  onHoverEvent: (eventId: string | null) => void;
};

export function EventImpactSidebar({
  cik,
  events,
  sort,
  activeEventId,
  selectedEventId,
  mobileOpen = false,
  onMobileClose,
  onSortChange,
  onSelectEvent,
  onHoverEvent,
}: EventImpactSidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close events list"
        />
      ) : null}

      <aside
        className={cn(
          "flex w-[300px] shrink-0 flex-col border-l border-zinc-100 bg-white",
          "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:h-dvh max-lg:transition-transform max-lg:duration-200 max-lg:ease-in-out",
          "lg:static lg:z-auto lg:h-full lg:min-h-0 lg:translate-x-0",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            aria-label="Close events list"
          >
            <NavIconClose />
          </button>
          <span className="truncate text-[13px] font-semibold text-zinc-900">Events</span>
        </div>

        <EventSortOptions sort={sort} onSortChange={onSortChange} />
        <EventImpactList
          cik={cik}
          events={events}
          activeEventId={activeEventId}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
          onHoverEvent={onHoverEvent}
        />
      </aside>
    </>
  );
}
