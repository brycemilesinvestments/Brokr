"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { FilingDiffPayload } from "@/routes/company/[cik]/filing/[accession]/lib/fetch-filing-diff";

type FilingDiffPanelProps = {
  cik: string;
  accessionNumber: string;
};

export function FilingDiffPanel({ cik, accessionNumber }: FilingDiffPanelProps) {
  const encoded = encodeURIComponent(accessionNumber);
  const { data, loading, error, refetch } = useCompanyApi<FilingDiffPayload>(
    `/api/company/${cik}/filing/${encoded}/diff`,
    true,
  );

  if (loading) {
    return <Shell title="Filing changes">Comparing to prior comparable filing…</Shell>;
  }

  if (error) {
    return (
      <Shell title="Filing changes">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </Shell>
    );
  }

  if (!data) return null;

  if (data.status === "no_pair") {
    return (
      <Shell title="Filing changes">
        <p className="text-sm text-zinc-600">{data.message}</p>
      </Shell>
    );
  }

  if (data.status === "error") {
    return (
      <Shell title="Filing changes">
        <p className="text-sm text-red-700">{data.message}</p>
      </Shell>
    );
  }

  const { diff } = data;
  const topNumeric = diff.numeric.items.filter((item) => item.changed).slice(0, 12);
  const changedProseSections = [];
  for (const section of diff.prose.sections) {
    if (section.changed) changedProseSections.push(section);
  }

  return (
    <Shell title="Filing changes">
      <p className="text-sm text-zinc-500">
        vs prior filing {diff.previousAccession} · severity{" "}
        <span className="font-medium uppercase text-zinc-800">{diff.severity.level}</span>
        {diff.cacheHit ? " · prose cached" : ""}
      </p>

      {topNumeric.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Numeric deltas</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4">Prior</th>
                  <th className="py-2 pr-4">Current</th>
                  <th className="py-2">Δ</th>
                </tr>
              </thead>
              <tbody>
                {topNumeric.map((item) => (
                  <tr key={item.metric} className="border-b border-zinc-50">
                    <td className="py-2 pr-4 font-mono text-xs">{item.metric}</td>
                    <td className="py-2 pr-4">{item.previous?.toLocaleString() ?? "—"}</td>
                    <td className="py-2 pr-4">{item.current?.toLocaleString() ?? "—"}</td>
                    <td className="py-2">
                      {item.delta != null ? item.delta.toLocaleString() : "—"}
                      {item.deltaPct != null ? ` (${(item.deltaPct * 100).toFixed(1)}%)` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {diff.structural.changed ? (
        <div className="mt-6 rounded-lg bg-zinc-50 px-4 py-3 text-sm">
          <p className="font-medium text-zinc-900">Structural changes</p>
          <p className="mt-1 text-zinc-600">
            Fields: {diff.structural.changedFields.join(", ")}
            {diff.structural.addedRiskTags.length > 0
              ? ` · new risk tags: ${diff.structural.addedRiskTags.join(", ")}`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-zinc-900">Prose diff (MD&A & risk factors)</h3>
        {diff.prose.changed ? (
          <ul className="mt-2 space-y-2 text-sm text-zinc-700">
            {changedProseSections.map((section) => (
              <li key={section.key} className="rounded-lg border border-zinc-100 px-3 py-2">
                <span className="font-medium">{section.key}</span>
                {section.summary ? `: ${section.summary}` : " changed"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            {diff.prose.refusal ? "No AI prose diff available." : "No material prose changes detected."}
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
