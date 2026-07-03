"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimelineEventSort } from "../lib/sort-timeline-events";

type EventSortOptionsProps = {
  sort: TimelineEventSort;
  onSortChange: (sort: TimelineEventSort) => void;
};

export function EventSortOptions({ sort, onSortChange }: EventSortOptionsProps) {
  return (
    <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Sort events
      </p>
      <Tabs
        value={sort}
        onValueChange={(value) => onSortChange(value as TimelineEventSort)}
        className="w-full"
      >
        <TabsList className="h-8 w-full">
          <TabsTrigger value="chronological" className="flex-1 px-2 text-xs">
            Chronological
          </TabsTrigger>
          <TabsTrigger value="absolute-impact" className="flex-1 px-2 text-xs">
            Absolute impact
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="mt-2 text-[11px] text-zinc-500">
        {sort === "absolute-impact"
          ? "Largest 2-month move first (+70 and −70 rank equally)"
          : "Newest events first"}
      </p>
    </div>
  );
}
