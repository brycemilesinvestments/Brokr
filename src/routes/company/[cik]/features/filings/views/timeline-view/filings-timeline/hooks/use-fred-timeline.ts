"use client";

import { useCallback, useMemo } from "react";
import type { FredTimelineEvent, FredTimelineResponse } from "@/lib/fred/types";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
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
  const range = useMemo(() => resolveFredDateRange(timeline), [timeline]);
  const timelineUrl = enabled
    ? `/api/fred/timeline?from=${range.from}&to=${range.to}`
    : null;

  const { data, loading, error, refetch } = useCompanyApi<FredTimelineResponse>(
    timelineUrl,
    enabled,
  );

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    events: data?.events ?? [],
    loading,
    error,
    seriesCount: data?.seriesCount ?? 0,
    range,
    reload,
  };
}
