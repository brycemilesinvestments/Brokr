"use client";

import { CATEGORY_LABELS, PERIOD_LABELS } from "./constants";
import { useFilingXbrl } from "./hooks/use-filing-xbrl";
import type { FilingXbrlProps } from "./types";
import { formatFactValue } from "./utils/format-fact-value";
import { formatPeriod } from "./utils/format-period";

export function FilingXbrl({
  cik,
  accessionNumber,
  documents,
  initialExtraction,
}: FilingXbrlProps) {
  const {
    xbrlDocuments,
    selectedDocument,
    setSelectedDocument,
    extraction,
    viewMode,
    setViewMode,
    query,
    setQuery,
    loading,
    error,
    activeDocument,
    statementRows,
    statementGroups,
    filteredRawFacts,
    loadExtraction,
  } = useFilingXbrl({ cik, accessionNumber, documents, initialExtraction });

  if (xbrlDocuments.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">XBRL data</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No inline XBRL or instance documents were found in this filing.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">XBRL financials</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Key line items at current and prior comparable periods — deduped from inline XBRL.
            </p>
          </div>
          {!extraction ? (
            <button
              type="button"
              onClick={() => loadExtraction()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
            >
              {loading ? "Extracting…" : "Extract XBRL"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {statementRows.length} line items · {extraction.totalFacts.toLocaleString()} raw
                facts
              </div>
              <div className="inline-flex rounded-xl border border-zinc-200 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("statements")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "statements"
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  Statements
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "raw"
                      ? "bg-emerald-100 text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  All raw facts
                </button>
              </div>
            </div>
          )}
        </div>

        {extraction ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {extraction.documents.map((doc) => (
              <button
                key={doc.documentName}
                type="button"
                onClick={() => setSelectedDocument(doc.documentName)}
                className={`rounded-full px-3 py-1 font-mono text-xs transition ${
                  selectedDocument === doc.documentName
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {doc.documentName}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {extraction && activeDocument ? (
        viewMode === "statements" ? (
          <div className="divide-y divide-zinc-100">
            {statementGroups.map((group) => (
              <div key={`${group.category}-${group.periodKind}`}>
                <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {CATEGORY_LABELS[group.category]} · {PERIOD_LABELS[group.periodKind]}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <tr className="border-b border-zinc-100">
                        <th className="px-6 py-3">Line item</th>
                        <th className="px-6 py-3">
                          Current
                          {group.currentLabel ? (
                            <div className="mt-1 font-normal normal-case text-zinc-400">
                              {group.currentLabel}
                            </div>
                          ) : null}
                        </th>
                        <th className="px-6 py-3">
                          Prior comparable
                          {group.priorLabel ? (
                            <div className="mt-1 font-normal normal-case text-zinc-400">
                              {group.priorLabel}
                            </div>
                          ) : null}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {group.rows.map((row) => (
                        <tr key={`${row.concept}-${row.periodKind}`} className="hover:bg-zinc-50/80">
                          <td className="px-6 py-3">
                            <div className="font-medium text-zinc-900">{row.label}</div>
                            <div className="mt-1 font-mono text-xs text-zinc-500">{row.concept}</div>
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-zinc-800">
                            {formatFactValue(row.current)}
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-zinc-800">
                            {formatFactValue(row.prior)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {statementRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                No standard financial line items matched this filing.
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-100 px-6 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <label htmlFor="xbrl-fact-search" className="sr-only">
                  Filter raw XBRL facts
                </label>
                <input
                  id="xbrl-fact-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter raw facts by concept, taxonomy, value, or period…"
                  className="w-full max-w-xl rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2"
                />
                <div className="text-xs text-zinc-500">
                  {filteredRawFacts.length.toLocaleString()} of{" "}
                  {activeDocument.facts.length.toLocaleString()} facts
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-6 py-3">Concept</th>
                    <th className="px-6 py-3">Value</th>
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3">Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRawFacts.map((fact, index) => (
                    <tr
                      key={`${fact.id ?? fact.name}-${fact.contextRef}-${index}`}
                      className="hover:bg-zinc-50/80"
                    >
                      <td className="px-6 py-3">
                        <div className="font-mono text-xs text-emerald-700">{fact.name}</div>
                        {fact.taxonomy ? (
                          <div className="mt-1 text-xs text-zinc-500">{fact.taxonomy}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-zinc-800">
                        {formatFactValue(fact)}
                      </td>
                      <td className="px-6 py-3 text-xs text-zinc-600">{formatPeriod(fact)}</td>
                      <td className="px-6 py-3 font-mono text-xs text-zinc-500">
                        {fact.contextRef}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRawFacts.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-500">
                No facts match your filter.
              </div>
            ) : null}
          </>
        )
      ) : (
        <div className="px-6 py-10 text-center text-sm text-zinc-500">
          {loading
            ? "Downloading and parsing inline XBRL…"
            : "Extract XBRL to view financial statement line items."}
        </div>
      )}
    </section>
  );
}
