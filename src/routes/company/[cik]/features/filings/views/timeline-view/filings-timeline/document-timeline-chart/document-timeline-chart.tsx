"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { CHART_VIEWPORT_HEIGHT } from "@/routes/company/[cik]/lib/chart-viewport";
import { EventImpactList } from "./components/event-impact-list";
import { EventSortOptions } from "./components/event-sort-options";
import { TimelinePriceChart } from "./components/timeline-price-chart";
import { useDocumentTimelineChart } from "./hooks/use-document-timeline-chart";
import {
  sortTimelineEvents,
  type TimelineEventSort,
} from "./lib/sort-timeline-events";
import type { DocumentTimelineChartProps, SelectedImpactWindow } from "./types";

function DocumentTimelineChartLoading() {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ height: CHART_VIEWPORT_HEIGHT }}
    >
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
      <p className="py-12 text-center text-sm text-zinc-500">
        No daily price data available for this range.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold text-zinc-900">{companyName}</span>
          {ticker ? (
            <span className="font-mono text-sm font-medium text-zinc-500">{ticker}</span>
          ) : null}
        </div>
        <span className="text-[11px] text-zinc-400">2-month price impact after each event</span>
      </div>

      <div className="flex min-h-0" style={{ height: CHART_VIEWPORT_HEIGHT }}>
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden border-r border-zinc-100 px-2 pb-1 pl-2 pt-1.5">
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

        <aside className="flex w-[300px] shrink-0 flex-col border-l border-zinc-100">
          <EventSortOptions sort={eventSort} onSortChange={setEventSort} />
          <EventImpactList
            cik={cik}
            events={sortedEvents}
            activeEventId={activeEventId}
            selectedEventId={selectedEventId}
            onSelectEvent={handleToggleEvent}
            onHoverEvent={setHoveredEventId}
          />
        </aside>
      </div>
    </>
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
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-5 py-12 text-center text-sm text-zinc-500">
          Stock price chart requires a ticker symbol for this company.
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
