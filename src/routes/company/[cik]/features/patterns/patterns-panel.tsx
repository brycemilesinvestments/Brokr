"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import type { PatternTrendsPayload } from "@/routes/company/[cik]/features/patterns/types";

type PatternsPanelProps = {
  cik: string;
  enabled: boolean;
};

export function PatternsPanel({ cik, enabled }: PatternsPanelProps) {
  const { data, loading, error, refetch } = useCompanyApi<PatternTrendsPayload>(
    enabled ? `/api/company/${cik}/patterns` : null,
    enabled,
  );

  if (loading) {
    return <Shell title="Pattern trends">Detecting multi-period trends…</Shell>;
  }

  if (error) {
    return (
      <Shell title="Pattern trends">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </Shell>
    );
  }

  if (!data) {
    return <Shell title="Pattern trends">Detecting multi-period trends…</Shell>;
  }

  return (
    <Shell title="Pattern trends">
      <p className="text-sm text-zinc-500">
        Sustained directional runs and cross-metric divergence patterns for {data.entityName}.
      </p>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-zinc-900">Directional trends</h3>
        {data.directional.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No sustained trends detected.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.directional.map((trend) => (
              <li key={`${trend.metric}-${trend.start_period}`} className="rounded-lg border border-zinc-100 px-3 py-2 text-sm">
                <span className="font-medium">{trend.metric}</span> {trend.direction} · {trend.run_length} periods ·{" "}
                <span className="uppercase text-zinc-500">{trend.severity}</span>
                <span className="block text-zinc-500">
                  {trend.start_period} → {trend.end_period}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-zinc-900">Cross-metric divergences</h3>
        {data.divergence.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No divergence patterns flagged.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.divergence.map((pattern) => (
              <li key={`${pattern.name}-${pattern.start_period}`} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-950">
                <span className="font-medium">{pattern.name.replace(/_/g, " ")}</span> · {pattern.severity}
                <span className="block text-red-800/80">{pattern.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
