"use client";

import { useMemo, useId, useState } from "react";
import type { FredCategory } from "@/lib/fred/constants";
import type { FredSeriesRow } from "@/lib/fred/types";
import { cn } from "@/lib/utils";
import { NavIconClose } from "@/routes/company/[cik]/components/company-sidebar/company-sidebar-icons";
import {
  FRED_ANALYTICS_CATEGORY_STYLES,
  FRED_ANALYTICS_FALLBACK_STYLE,
} from "../constants";

type FredSeriesSidebarProps = {
  series: FredSeriesRow[];
  selectedSeriesId: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onSelectSeries: (seriesId: string) => void;
};

export function FredSeriesSidebar({
  series,
  selectedSeriesId,
  mobileOpen = false,
  onMobileClose,
  onSelectSeries,
}: FredSeriesSidebarProps) {
  const [query, setQuery] = useState("");
  const searchInputId = useId();

  const grouped = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? series.filter(
          (item) =>
            item.series_id.toLowerCase().includes(normalizedQuery) ||
            item.name.toLowerCase().includes(normalizedQuery) ||
            item.category.toLowerCase().includes(normalizedQuery),
        )
      : series;

    return filtered.reduce<Map<string, FredSeriesRow[]>>((acc, item) => {
      const bucket = acc.get(item.category) ?? [];
      bucket.push(item);
      acc.set(item.category, bucket);
      return acc;
    }, new Map());
  }, [query, series]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close series list"
        />
      ) : null}

      <aside
        className={cn(
          "flex w-[254px] shrink-0 flex-col border-r border-zinc-200 bg-white",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:h-dvh max-lg:transition-transform max-lg:duration-200 max-lg:ease-in-out",
          "lg:static lg:z-auto lg:h-full lg:min-h-0 lg:translate-x-0",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3.5 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            aria-label="Close series list"
          >
            <NavIconClose />
          </button>
          <span className="truncate text-[13px] font-semibold text-zinc-900">Series</span>
        </div>

        <div className="shrink-0 px-3.5 pb-2.5 pt-3.5">
          <div className="hidden text-[13px] font-semibold text-zinc-900 lg:block">Series</div>
          <div className="mt-0.5 text-[11px] text-zinc-400 lg:mt-0.5">
          {series.length} U.S. economic indicator{series.length === 1 ? "" : "s"}
        </div>
        <label htmlFor={searchInputId} className="relative mt-2.5 flex h-[30px] items-center gap-1.5 rounded-[9px] border border-zinc-200 bg-zinc-50 px-2.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.5"
            className="shrink-0"
            aria-hidden
          >
            <circle cx="6" cy="6" r="4.2" />
            <line x1="9.3" y1="9.3" x2="12" y2="12" />
          </svg>
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter series…"
            aria-label="Filter series"
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-zinc-700 outline-none placeholder:text-zinc-400"
          />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3.5">
        {[...grouped.entries()].map(([category, items]) => {
          const styles =
            FRED_ANALYTICS_CATEGORY_STYLES[category as FredCategory] ??
            FRED_ANALYTICS_FALLBACK_STYLE;

          return (
            <div key={category}>
              <div className="flex items-center gap-1.5 px-2 pb-1 pt-3">
                <span className={`size-[7px] rounded-full ${styles.dot}`} aria-hidden />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {styles.label}
                </span>
              </div>

              {items.map((item) => {
                const isSelected = selectedSeriesId === item.series_id;
                return (
                  <button
                    key={item.series_id}
                    type="button"
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => {
                      onSelectSeries(item.series_id);
                      onMobileClose?.();
                    }}
                    className={[
                      "mb-px flex w-full flex-col gap-0.5 rounded-[9px] px-2 py-1.5 text-left transition-colors",
                      isSelected
                        ? `${styles.selectedBg} ${styles.selectedRing}`
                        : "bg-transparent hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <span
                      className={`w-fit rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-semibold ${styles.badge}`}
                    >
                      {item.series_id}
                    </span>
                    <span
                      className={`text-[11.5px] leading-snug ${
                        isSelected ? "font-medium text-zinc-900" : "font-medium text-zinc-600"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      </aside>
    </>
  );
}
