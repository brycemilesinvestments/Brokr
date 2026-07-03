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
    <div className="space-y-4">
      {fred.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Macro indicators unavailable: {fred.error}
        </div>
      ) : null}

      {fred.loading && filteredFilings.length === 0 && filteredFredEvents.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">Loading timeline events…</p>
      ) : null}

      <DocumentTimelineChart
        cik={cik}
        companyName={companyName}
        filings={filteredFilings}
        fredEvents={filteredFredEvents}
        ticker={ticker}
        enabled={enabled}
      />
    </div>
  );
}
