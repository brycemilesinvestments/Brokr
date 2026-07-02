"use client";

import { useEffect, useMemo, useState } from "react";
import type { FredTimelineEvent, FredTimelineResponse } from "@/lib/fred/types";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";

function resolveFredDateRange(timeline: TimelineFiling[]): { from: string; to: string } {
  const to = new Date().toISOString().slice(0, 10);

  if (timeline.length === 0) {
    const fromDate = new Date();
    fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 5);
    return { from: fromDate.toISOString().slice(0, 10), to };
  }

  const earliest = [...timeline.map((filing) => filing.timelineDate)].sort()[0];
  const fromDate = new Date(`${earliest}T00:00:00Z`);
  fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1);

  return { from: fromDate.toISOString().slice(0, 10), to };
}

export function useFredTimeline({
  timeline,
  enabled,
}: {
  timeline: TimelineFiling[];
  enabled: boolean;
}) {
  const [events, setEvents] = useState<FredTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesCount, setSeriesCount] = useState(0);

  const range = useMemo(() => resolveFredDateRange(timeline), [timeline]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/fred/timeline?from=${range.from}&to=${range.to}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as FredTimelineResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load macro indicators");
        }

        setEvents(payload.events);
        setSeriesCount(payload.seriesCount);
      } catch (err) {
        if (controller.signal.aborted) return;
        setEvents([]);
        setSeriesCount(0);
        setError(err instanceof Error ? err.message : "Failed to load macro indicators");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [enabled, range.from, range.to]);

  return {
    events,
    loading,
    error,
    seriesCount,
    range,
  };
}
