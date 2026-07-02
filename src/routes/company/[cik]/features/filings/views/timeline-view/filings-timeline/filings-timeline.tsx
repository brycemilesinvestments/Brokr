"use client";

import { CORE_FORM_CATEGORIES, CORE_FORM_META } from "@/lib/edgar/core-forms";
import { FiscalYearSection } from "./components/fiscal-year-section";
import { DocumentTimelineChart } from "./document-timeline-chart/document-timeline-chart";
import { TimelineEntry } from "./components/timeline-entry";
import { CATEGORY_STYLES } from "./constants";
import { useFilingsTimeline } from "./hooks/use-filings-timeline";
import type { FilingsTimelineProps } from "./types";

export function FilingsTimeline({
  cik,
  timeline,
  fiscalYearEnd,
  ticker,
  enabled = true,
}: FilingsTimelineProps) {
  const {
    viewMode,
    setViewMode,
    activeCategories,
    filtered,
    fiscalGroups,
    counts,
    toggleCategory,
  } = useFilingsTimeline(timeline);

  if (timeline.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Document timeline</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {filtered.length} of {timeline.length} primary filings — stock price with 8-K markers
              above, filing list below
              {fiscalYearEnd ? ` (FY end ${fiscalYearEnd})` : ""}
            </p>
          </div>

          <div className="flex rounded-lg border border-zinc-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("chronological")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                viewMode === "chronological"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Chronological
            </button>
            <button
              type="button"
              onClick={() => setViewMode("fiscal-year")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                viewMode === "fiscal-year"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              By fiscal year
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CORE_FORM_CATEGORIES.map((category) => {
            const meta = CORE_FORM_META[category];
            const styles = CATEGORY_STYLES[category];
            const active = activeCategories.has(category);

            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                title={meta.description}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? styles.badge
                    : "bg-zinc-100 text-zinc-400 line-through"
                }`}
              >
                {meta.label}
                <span className="ml-1.5 opacity-70">{counts[category]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <DocumentTimelineChart
        cik={cik}
        timeline={timeline}
        ticker={ticker}
        enabled={enabled}
      />

      <div className="px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No filings match the selected form types.
          </p>
        ) : viewMode === "chronological" ? (
          <div className="pl-1">
            {filtered.map((filing) => (
              <TimelineEntry
                key={filing.accessionNumber ?? `${filing.filingDate}-${filing.type}`}
                cik={cik}
                filing={filing}
              />
            ))}
          </div>
        ) : fiscalGroups.length > 0 ? (
          <div className="space-y-8">
            {fiscalGroups.map((group) => (
              <FiscalYearSection key={group.fiscalYear} cik={cik} group={group} />
            ))}
          </div>
        ) : (
          <div className="pl-1">
            {filtered.map((filing) => (
              <TimelineEntry
                key={filing.accessionNumber ?? `${filing.filingDate}-${filing.type}`}
                cik={cik}
                filing={filing}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-3">
        <dl className="grid gap-3 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_FORM_CATEGORIES.map((category) => (
            <div key={category}>
              <dt className="font-semibold text-zinc-800">{CORE_FORM_META[category].label}</dt>
              <dd className="mt-0.5">{CORE_FORM_META[category].description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
