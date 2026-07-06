"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { EventImpactSidebar } from "./components/event-impact-sidebar";
import {
  TimelinePriceChart,
  type TimelinePriceChartHandle,
} from "./components/timeline-price-chart";
import { useDocumentTimelineChart } from "./hooks/use-document-timeline-chart";
import { EMPTY_FRED_TIMELINE_EVENTS } from "./constants";
import {
  sortTimelineEvents,
  type TimelineEventSort,
} from "./lib/sort-timeline-events";
import type { DocumentTimelineChartProps, SelectedImpactWindow } from "./types";

function DocumentTimelineChartLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-zinc-500">Loading price chart…</p>
    </div>
  );
}

function DocumentTimelineChartContent({
  cik,
  filings,
  fredEvents = EMPTY_FRED_TIMELINE_EVENTS,
}: Pick<DocumentTimelineChartProps, "cik" | "filings" | "fredEvents">) {
  const { chartData, chartMarkers, rankedEvents, hasChartData } = useDocumentTimelineChart({
    cik,
    filings,
    fredEvents,
  });
  const chartRef = useRef<TimelinePriceChartHandle>(null);
  const [eventSort, setEventSort] = useState<TimelineEventSort>("chronological");
  const [eventsSidebarOpen, setEventsSidebarOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    chartRef.current?.zoomToEvent(eventId);
  }, []);
  const handleToggleEvent = useCallback((eventId: string) => {
    setSelectedEventId((current) => {
      const next = current === eventId ? null : eventId;
      chartRef.current?.zoomToEvent(next);
      return next;
    });
  }, []);
  const activeEventId = hoveredEventId ?? selectedEventId;
  const sortedEvents = useMemo(
    () => sortTimelineEvents(rankedEvents, eventSort),
    [rankedEvents, eventSort],
  );
  const impactChartMarkers = useMemo(() => {
    const rankedIds = new Set(rankedEvents.map((event) => event.id));
    return chartMarkers.filter((marker) => rankedIds.has(marker.id));
  }, [chartMarkers, rankedEvents]);
  const selectedImpactWindow = useMemo<SelectedImpactWindow | null>(() => {
    if (!selectedEventId) return null;

    const event = rankedEvents.find((item) => item.id === selectedEventId);
    if (!event) return null;

    return {
      startDate: event.snappedDate,
      endDate: event.impactEndDate,
      priceImpact: event.priceImpact,
    };
  }, [rankedEvents, selectedEventId]);

  if (!hasChartData) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        No daily price data available for this range.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-1 pl-2 pt-1.5 lg:border-r lg:border-zinc-100">
          <TimelinePriceChart
            ref={chartRef}
            chartData={chartData}
            chartMarkers={impactChartMarkers}
            activeEventId={activeEventId}
            selectedEventId={selectedEventId}
            selectedImpactWindow={selectedImpactWindow}
            onSelectEvent={handleSelectEvent}
            onHoverEvent={setHoveredEventId}
          />
        </div>

        <EventImpactSidebar
          cik={cik}
          events={sortedEvents}
          sort={eventSort}
          activeEventId={activeEventId}
          selectedEventId={selectedEventId}
          mobileOpen={eventsSidebarOpen}
          onMobileClose={() => setEventsSidebarOpen(false)}
          onSortChange={setEventSort}
          onSelectEvent={handleToggleEvent}
          onHoverEvent={setHoveredEventId}
        />
      </div>
    </div>
  );
}

export function DocumentTimelineChart({
  cik,
  companyName,
  filings,
  fredEvents = EMPTY_FRED_TIMELINE_EVENTS,
  ticker,
  enabled,
}: DocumentTimelineChartProps) {
  if (!enabled) {
    return null;
  }

  if (!ticker) {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="flex flex-1 items-center justify-center px-5 text-sm text-zinc-500">
          Stock price chart requires a ticker symbol for this company.
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <Suspense fallback={<DocumentTimelineChartLoading />}>
        <DocumentTimelineChartContent
          cik={cik}
          filings={filings}
          fredEvents={fredEvents}
        />
      </Suspense>
    </section>
  );
}
