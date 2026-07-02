"use client";

import { useMemo, useState } from "react";
import { FRED_CATEGORIES, type FredCategory } from "@/lib/fred/constants";
import { CORE_FORM_CATEGORIES, type CoreFormCategory } from "@/lib/edgar/core-forms";
import {
  groupTimelineByFiscalYear,
  type TimelineFiling,
} from "@/routes/company/[cik]/features/filings/lib/timeline";
import type { FredTimelineEvent } from "@/lib/fred/types";
import type { DocumentTimelineItem, ViewMode } from "../types";
import { useFredTimeline } from "./use-fred-timeline";

export function useDocumentTimeline({
  timeline,
  enabled,
}: {
  timeline: TimelineFiling[];
  enabled: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("chronological");
  const [activeCategories, setActiveCategories] = useState<Set<CoreFormCategory>>(
    () => new Set(CORE_FORM_CATEGORIES),
  );
  const [activeFredCategories, setActiveFredCategories] = useState<Set<FredCategory>>(
    () => new Set(FRED_CATEGORIES),
  );
  const [showMacroIndicators, setShowMacroIndicators] = useState(true);

  const fred = useFredTimeline({ timeline, enabled: enabled && showMacroIndicators });

  const filteredFilings = useMemo(
    () => timeline.filter((filing) => activeCategories.has(filing.category)),
    [timeline, activeCategories],
  );

  const filteredFredEvents = useMemo(
    () =>
      showMacroIndicators
        ? fred.events.filter((event) => activeFredCategories.has(event.category as FredCategory))
        : [],
    [fred.events, activeFredCategories, showMacroIndicators],
  );

  const mergedItems = useMemo((): DocumentTimelineItem[] => {
    const items: DocumentTimelineItem[] = [
      ...filteredFilings.map(
        (filing): DocumentTimelineItem => ({
          kind: "filing",
          sortDate: filing.timelineDate,
          filing,
        }),
      ),
      ...filteredFredEvents.map(
        (event): DocumentTimelineItem => ({
          kind: "fred",
          sortDate: event.observationDate,
          event,
        }),
      ),
    ];

    return items.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  }, [filteredFilings, filteredFredEvents]);

  const fiscalGroups = useMemo(
    () => groupTimelineByFiscalYear(filteredFilings),
    [filteredFilings],
  );

  const filingCounts = useMemo(() => {
    const result = Object.fromEntries(CORE_FORM_CATEGORIES.map((c) => [c, 0])) as Record<
      CoreFormCategory,
      number
    >;
    for (const filing of timeline) {
      result[filing.category]++;
    }
    return result;
  }, [timeline]);

  const fredCounts = useMemo(() => {
    const result = Object.fromEntries(FRED_CATEGORIES.map((c) => [c, 0])) as Record<
      FredCategory,
      number
    >;
    for (const event of fred.events) {
      if (result[event.category as FredCategory] != null) {
        result[event.category as FredCategory]++;
      }
    }
    return result;
  }, [fred.events]);

  function toggleCategory(category: CoreFormCategory) {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function toggleFredCategory(category: FredCategory) {
    setActiveFredCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        if (next.size > 1) next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return {
    viewMode,
    setViewMode,
    activeCategories,
    activeFredCategories,
    showMacroIndicators,
    setShowMacroIndicators,
    filteredFilings,
    filteredFredEvents,
    mergedItems,
    fiscalGroups,
    filingCounts,
    fredCounts,
    toggleCategory,
    toggleFredCategory,
    fred,
  };
}

export type { FredTimelineEvent };
