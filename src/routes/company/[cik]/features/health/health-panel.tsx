"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { HealthScoreBundle } from "@/lib/metrics/health/types";

type HealthPanelProps = {
  cik: string;
  enabled: boolean;
};

const SUBSCORE_LABELS: Record<string, string> = {
  profitability: "Profitability",
  growth_quality: "Growth quality",
  balance_sheet: "Balance sheet",
  cash_generation: "Cash generation",
  dilution: "Dilution",
};

export function HealthPanel({ cik, enabled }: HealthPanelProps) {
  const { data, loading, error, refetch } = useCompanyApi<HealthScoreBundle>(
    enabled ? `/api/company/${cik}/health` : null,
    enabled,
  );

  if (loading) {
    return <Shell title="Financial health">Computing health score series…</Shell>;
  }

  if (error) {
    return (
      <Shell title="Financial health">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </Shell>
    );
  }

  if (!data) {
    return <Shell title="Financial health">Computing health score series…</Shell>;
  }

  const latest = data.series.points.at(-1);

  return (
    <Shell title="Financial health">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>{data.series.framing.type.toUpperCase()}</strong> — {data.series.framing.disclaimer}
      </div>

      {latest ? (
        <div className="mt-6">
          <p className="text-3xl font-semibold text-zinc-900">{latest.composite.toFixed(0)}</p>
          <p className="text-sm text-zinc-500">
            Composite score · period ending {latest.periodEnd}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.subscores.map((sub) => (
              <div key={sub.key} className="rounded-xl border border-zinc-100 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {SUBSCORE_LABELS[sub.key] ?? sub.key}
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{sub.score.toFixed(0)}</p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                  {sub.inputs.slice(0, 3).map((input) => (
                    <li key={input.metricKey}>
                      {input.label}: {input.value != null ? input.value.toFixed(3) : "n/a"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">No periods available for health scoring.</p>
      )}

      {data.series.points.length > 1 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-zinc-900">History</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2">Composite</th>
                </tr>
              </thead>
              <tbody>
                {[...data.series.points].reverse().slice(0, 8).map((point) => (
                  <tr key={point.periodEnd} className="border-b border-zinc-50">
                    <td className="py-2 pr-4">{point.periodEnd}</td>
                    <td className="py-2">{point.composite.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
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
