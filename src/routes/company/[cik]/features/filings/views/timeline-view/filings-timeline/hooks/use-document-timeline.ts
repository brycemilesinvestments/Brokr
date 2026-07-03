"use client";

import { useMemo } from "react";
import { FRED_CATEGORIES, type FredCategory } from "@/lib/fred/constants";
import { CORE_FORM_CATEGORIES, type CoreFormCategory } from "@/lib/edgar/core-forms";
import type { TimelineFiling } from "@/routes/company/[cik]/features/filings/types";
import { useFredTimeline } from "./use-fred-timeline";

export function useDocumentTimeline({
  timeline,
  enabled,
}: {
  timeline: TimelineFiling[];
  enabled: boolean;
}) {
  const fred = useFredTimeline({ timeline, enabled });

  const filteredFilings = useMemo(
    () => timeline.filter((filing) => CORE_FORM_CATEGORIES.includes(filing.category)),
    [timeline],
  );

  const filteredFredEvents = useMemo(
    () =>
      fred.events.filter((event) => FRED_CATEGORIES.includes(event.category as FredCategory)),
    [fred.events],
  );

  return {
    filteredFilings,
    filteredFredEvents,
    fred,
  };
}
