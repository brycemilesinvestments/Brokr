"use client";

import { useMemo, useState } from "react";
import { CORE_FORM_CATEGORIES, type CoreFormCategory } from "@/lib/edgar/core-forms";
import { groupTimelineByFiscalYear, type TimelineFiling } from "@/routes/company/[cik]/features/filings/lib/timeline";
import type { ViewMode } from "../types";

export function useFilingsTimeline(timeline: TimelineFiling[]) {
  const [viewMode, setViewMode] = useState<ViewMode>("chronological");
  const [activeCategories, setActiveCategories] = useState<Set<CoreFormCategory>>(
    () => new Set(CORE_FORM_CATEGORIES),
  );

  const filtered = useMemo(
    () => timeline.filter((f) => activeCategories.has(f.category)),
    [timeline, activeCategories],
  );

  const fiscalGroups = useMemo(() => groupTimelineByFiscalYear(filtered), [filtered]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(CORE_FORM_CATEGORIES.map((c) => [c, 0])) as Record<
      CoreFormCategory,
      number
    >;
    for (const filing of timeline) {
      result[filing.category]++;
    }
    return result;
  }, [timeline]);

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

  return {
    viewMode,
    setViewMode,
    activeCategories,
    filtered,
    fiscalGroups,
    counts,
    toggleCategory,
  };
}
