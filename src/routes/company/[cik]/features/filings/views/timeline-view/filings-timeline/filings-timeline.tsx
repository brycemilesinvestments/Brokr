"use client";

import { CORE_FORM_CATEGORIES, CORE_FORM_META } from "@/lib/edgar/core-forms";
import { FRED_CATEGORIES } from "@/lib/fred/constants";
import { FiscalYearSection } from "./components/fiscal-year-section";
import { FredTimelineEntry } from "./components/fred-timeline-entry";
import { TimelineEntry } from "./components/timeline-entry";
import { DocumentTimelineChart } from "./document-timeline-chart";
import { CATEGORY_STYLES, FRED_CATEGORY_STYLES } from "./constants";
import { useDocumentTimeline } from "./hooks/use-document-timeline";
import type { DocumentTimelineItem, FilingsTimelineProps } from "./types";

function DocumentTimelineListItem({
  cik,
  item,
}: {
  cik: string;
  item: DocumentTimelineItem;
}) {
  if (item.kind === "filing") {
    return (
      <TimelineEntry
        key={item.filing.accessionNumber ?? `${item.filing.filingDate}-${item.filing.type}`}
        cik={cik}
        filing={item.filing}
      />
    );
  }

  return <FredTimelineEntry key={item.event.id} event={item.event} />;
}

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
    activeFredCategories,
    showMacroIndicators,
    setShowMacroIndicators,
    filteredFilings,
    mergedItems,
    fiscalGroups,
    filingCounts,
    fredCounts,
    filteredFredEvents,
    toggleCategory,
    toggleFredCategory,
    fred,
  } = useDocumentTimeline({ timeline, enabled });

  if (timeline.length === 0 && !fred.loading && fred.events.length === 0) {
    return null;
  }

  const visibleCount = mergedItems.length;
  const totalCount = timeline.length + (showMacroIndicators ? fred.events.length : 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Document timeline</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {visibleCount} of {totalCount} events — SEC filings and macro indicator releases
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

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
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
                    active ? styles.badge : "bg-zinc-100 text-zinc-400 line-through"
                  }`}
                >
                  {meta.label}
                  <span className="ml-1.5 opacity-70">{filingCounts[category]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMacroIndicators((current) => !current)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                showMacroIndicators
                  ? "bg-indigo-100 text-indigo-800"
                  : "bg-zinc-100 text-zinc-400 line-through"
              }`}
            >
              Macro indicators
              <span className="ml-1.5 opacity-70">{fred.events.length}</span>
            </button>

            {showMacroIndicators
              ? FRED_CATEGORIES.map((category) => {
                  const styles = FRED_CATEGORY_STYLES[category];
                  const active = activeFredCategories.has(category);

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleFredCategory(category)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active ? styles.badge : "bg-zinc-100 text-zinc-400 line-through"
                      }`}
                    >
                      {category}
                      <span className="ml-1.5 opacity-70">{fredCounts[category]}</span>
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      </div>

      <DocumentTimelineChart
        cik={cik}
        timeline={timeline}
        fredEvents={filteredFredEvents}
        ticker={ticker}
        enabled={enabled}
      />

      <div className="px-6 py-6">
        {fred.error ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Macro indicators unavailable: {fred.error}
          </div>
        ) : null}

        {fred.loading && showMacroIndicators && mergedItems.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">Loading macro indicator releases…</p>
        ) : visibleCount === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No events match the selected filters.
          </p>
        ) : viewMode === "chronological" ? (
          <div className="pl-1">
            {mergedItems.map((item) => (
              <DocumentTimelineListItem
                key={item.kind === "filing"
                  ? item.filing.accessionNumber ?? `${item.filing.filingDate}-${item.filing.type}`
                  : item.event.id}
                cik={cik}
                item={item}
              />
            ))}
          </div>
        ) : fiscalGroups.length > 0 ? (
          <div className="space-y-8">
            {fiscalGroups.map((group) => (
              <FiscalYearSection key={group.fiscalYear} cik={cik} group={group} />
            ))}
            {showMacroIndicators && filteredFredEvents.length > 0 ? (
              <div>
                <h3 className="mb-4 text-sm font-semibold text-zinc-900">Macro indicators</h3>
                <div className="pl-1">
                  {filteredFredEvents.map((event) => (
                    <FredTimelineEntry key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="pl-1">
            {filteredFilings.map((filing) => (
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
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="font-semibold text-zinc-800">Macro indicators (FRED)</dt>
            <dd className="mt-0.5">
              U.S. economic releases from the St. Louis Fed, shown alongside company filings for
              macro context. Run <code className="rounded bg-zinc-200 px-1">npm run ingest-fred</code>{" "}
              to refresh data.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
