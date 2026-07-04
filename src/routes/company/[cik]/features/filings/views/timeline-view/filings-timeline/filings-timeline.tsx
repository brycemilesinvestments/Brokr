"use client";

import { DocumentTimelineChart } from "./document-timeline-chart/document-timeline-chart";
import { useDocumentTimeline } from "./hooks/use-document-timeline";
import type { FilingsTimelineProps } from "./types";

export function FilingsTimeline({
  cik,
  companyName,
  timeline,
  ticker,
  enabled = true,
}: FilingsTimelineProps) {
  const { filteredFilings, filteredFredEvents, fred } = useDocumentTimeline({
    timeline,
    enabled,
  });

  if (timeline.length === 0 && !enabled) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {fred.error ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          Macro indicators unavailable: {fred.error}
        </div>
      ) : null}

      {fred.loading && filteredFilings.length === 0 && filteredFredEvents.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading timeline events…
        </p>
      ) : (
        <DocumentTimelineChart
          cik={cik}
          companyName={companyName}
          filings={filteredFilings}
          fredEvents={filteredFredEvents}
          ticker={ticker}
          enabled={enabled}
        />
      )}
    </div>
  );
}
