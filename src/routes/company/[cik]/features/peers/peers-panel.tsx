"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import {
  PEER_DISPLAY_METRICS,
  type PeerComparisonPayload,
} from "@/routes/company/[cik]/features/peers/types";

type PeersPanelProps = {
  cik: string;
  enabled: boolean;
};

function formatMetric(key: string): string {
  return key.replace(/_/g, " ");
}

export function PeersPanel({ cik, enabled }: PeersPanelProps) {
  const { data, loading, error, refetch } = useCompanyApi<PeerComparisonPayload>(
    enabled ? `/api/company/${cik}/peers` : null,
    enabled,
  );

  if (loading) {
    return <PanelShell title="Peer comparison">Loading SIC peers and relative metrics…</PanelShell>;
  }

  if (error) {
    return (
      <PanelShell title="Peer comparison">
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </PanelShell>
    );
  }

  if (!data) {
    return <PanelShell title="Peer comparison">Loading SIC peers and relative metrics…</PanelShell>;
  }

  if (data.status === "insufficient_peers") {
    return (
      <PanelShell title="Peer comparison">
        <p className="text-sm text-zinc-600">
          {data.reason === "insufficient_peer_data" ? (
            <>
              {data.peerCount} peer(s) resolved
              {data.sic ? ` for SIC ${data.sic}` : ""}, but only {data.metricsWithData ?? 0} of{" "}
              {data.metricsRequired ?? 4} metrics had data from at least 2 peers. Cannot produce a
              valid comparison.
            </>
          ) : (
            <>
              Only {data.peerCount} peer(s) resolved
              {data.sic ? ` for SIC ${data.sic}` : ""}. Need at least 2 for comparison.
            </>
          )}
        </p>
      </PanelShell>
    );
  }

  const { bundle } = data;

  return (
    <PanelShell title="Peer comparison">
      <p className="text-sm text-zinc-500">
        {bundle.peerSet.peers.length} peers — calendar-aligned annual percentiles vs peer median.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {bundle.peerSet.peers.map((peer) => (
          <span
            key={peer.cik}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
          >
            {peer.entityName} ({peer.selectionMethod})
          </span>
        ))}
      </div>

      {bundle.divergences.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Divergences from peer trend</h3>
          <ul className="mt-2 space-y-2">
            {bundle.divergences.map((flag) => (
              <li key={`${flag.metricKey}-${flag.calendarKey}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {flag.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {PEER_DISPLAY_METRICS.map((metricKey) => {
          const series = bundle.relativeMetrics.find((s) => s.metricKey === metricKey);
          if (!series) return null;
          const comparableBand = [...series.peerBand]
            .reverse()
            .find((band) => band.peerCount >= 2 && band.median !== null);
          const targetAtPeriod = comparableBand
            ? series.target.find((t) => t.calendarKey === comparableBand.calendarKey)
            : undefined;
          const comparablePct = comparableBand
            ? series.percentileRank.find((p) => p.calendarKey === comparableBand.calendarKey)
            : undefined;
          if (!targetAtPeriod || !comparableBand || !comparablePct) return null;

          const isRatio = metricKey.includes("margin") || metricKey.includes("ratio");
          const scale = isRatio ? 100 : 1;
          const suffix = isRatio ? "%" : "";

          return (
            <div key={metricKey} className="rounded-xl border border-zinc-100 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-medium capitalize text-zinc-900">{formatMetric(metricKey)}</h3>
                <span className="text-sm text-zinc-500">
                  {comparablePct.rank !== null ? `${comparablePct.rank}th percentile` : "n/a"} · n=
                  {comparableBand.peerCount} · {comparableBand.calendarKey}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                Target {(targetAtPeriod.value * scale).toFixed(1)}
                {suffix} vs peer median {(comparableBand.median! * scale).toFixed(1)}
                {suffix} ({(comparableBand.min! * scale).toFixed(1)}–{(comparableBand.max! * scale).toFixed(1)}{" "}
                {suffix} band)
              </p>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

function PanelShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-5">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="px-6 py-6">{children}</div>
    </section>
  );
}
