"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { EventImpactSidebar } from "./components/event-impact-sidebar";
import { TimelinePriceChart } from "./components/timeline-price-chart";
import { useDocumentTimelineChart } from "./hooks/use-document-timeline-chart";
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
  companyName,
  filings,
  fredEvents = [],
  ticker,
}: Pick<
  DocumentTimelineChartProps,
  "cik" | "companyName" | "filings" | "fredEvents" | "ticker"
>) {
  const { chartData, chartMarkers, rankedEvents, hasChartData } = useDocumentTimelineChart({
    cik,
    filings,
    fredEvents,
  });
  const [eventSort, setEventSort] = useState<TimelineEventSort>("chronological");
  const [eventsSidebarOpen, setEventsSidebarOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const handleSelectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
  }, []);
  const handleToggleEvent = useCallback((eventId: string) => {
    setSelectedEventId((current) => (current === eventId ? null : eventId));
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
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold text-zinc-900">{companyName}</span>
          {ticker ? (
            <span className="font-mono text-sm font-medium text-zinc-500">{ticker}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-zinc-400 sm:inline">
            2-month price impact after each event
          </span>
          <button
            type="button"
            onClick={() => setEventsSidebarOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 lg:hidden"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden
            >
              <rect x="7.5" y="2" width="4.5" height="10" rx="1" />
              <line x1="2" y1="4.5" x2="5.5" y2="4.5" />
              <line x1="2" y1="7" x2="5.5" y2="7" />
              <line x1="2" y1="9.5" x2="5.5" y2="9.5" />
            </svg>
            Events
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-1 pl-2 pt-1.5 lg:border-r lg:border-zinc-100">
          <TimelinePriceChart
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
  fredEvents = [],
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
          companyName={companyName}
          filings={filings}
          fredEvents={fredEvents}
          ticker={ticker}
        />
      </Suspense>
    </section>
  );
}
