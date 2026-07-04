"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { GuidanceRouterOutput } from "@/lib/guidance/types";

type GuidancePanelProps = {
  cik: string;
  enabled: boolean;
};

export function GuidancePanel({ cik, enabled }: GuidancePanelProps) {
  const { data, loading, error, refetch } = useCompanyApi<GuidanceRouterOutput>(
    enabled ? `/api/company/${cik}/guidance` : null,
    enabled,
  );

  if (loading) {
    return <Shell title="Earnings guidance">Scanning earnings 8-Ks…</Shell>;
  }

  if (error) {
    return (
      <Shell title="Earnings guidance">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </Shell>
    );
  }

  if (!data) {
    return <Shell title="Earnings guidance">Scanning earnings 8-Ks…</Shell>;
  }

  return (
    <Shell title="Earnings guidance">
      <p className="text-sm text-zinc-500">
        Company-stated guidance from earnings 8-K / EX-99.1 press releases — not analyst estimates.
      </p>

      {data.candidates.length === 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-600">No earnings 8-K candidates found in recent filings.</p>
          {data.earnings8kAudit.length > 0 ? (
            <details className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                8-K audit trail ({data.earnings8kAudit.length} examined)
              </summary>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600">
                {data.earnings8kAudit.map((entry) => (
                  <li key={entry.accessionNumber}>
                    <span className="font-medium text-zinc-800">{entry.filingDate}</span> ·{" "}
                    {entry.accessionNumber} · score {entry.score} ·{" "}
                    {entry.accepted ? "accepted" : `rejected: ${entry.rejectionReason}`}
                    {entry.reasons.length > 0 ? ` (${entry.reasons.join(", ")})` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="text-xs text-zinc-500">No 8-K filings in the indexed submission range.</p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {data.candidates.map((candidate) => {
            const guidance = data.guidanceByAccession[candidate.accessionNumber];
            const comparisons = data.comparisonsByAccession[candidate.accessionNumber] ?? [];

            return (
              <div key={candidate.accessionNumber} className="rounded-xl border border-zinc-100 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium text-zinc-900">{candidate.form}</h3>
                  <span className="text-xs text-zinc-500">{candidate.filingDate}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{candidate.accessionNumber}</p>

                {guidance?.hasGuidance ? (
                  <div className="mt-3">
                    {guidance.summary ? (
                      <p className="text-sm text-zinc-700">{guidance.summary}</p>
                    ) : null}
                    {guidance.ranges.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                        {guidance.ranges.map((range, index) => (
                          <li key={`${range.metric}-${index}`}>
                            {range.metric}: {range.low ?? "?"} – {range.high ?? "?"}{" "}
                            {range.unit ?? ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">No guidance language extracted.</p>
                )}

                {comparisons.length > 0 ? (
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Guidance vs actual
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {comparisons.map((row, index) => (
                        <li key={`${row.metric}-${index}`}>
                          {row.metric}: actual {row.actual ?? "n/a"} ·{" "}
                          {row.inRange === true ? "in range" : row.inRange === false ? "missed" : "unknown"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}
