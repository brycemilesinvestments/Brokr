"use client";

import { Button } from "@/components/ui/button";
import { PeersComparisonLoading } from "@/components/bones/peers-comparison-loading";
import { useCompanyApi } from "@/routes/company/[cik]/hooks/use-company-api";
import { PeersComparisonCard } from "@/routes/company/[cik]/features/peers/components/peers-comparison-card";
import type { PeerComparisonPayload } from "@/routes/company/[cik]/features/peers/types";

type PeersPanelProps = {
  cik: string;
  ticker?: string;
  enabled: boolean;
};

export function PeersPanel({ cik, ticker, enabled }: PeersPanelProps) {
  const { data, loading, error, refetch } = useCompanyApi<PeerComparisonPayload>(
    enabled ? `/api/company/${cik}/peers` : null,
    enabled,
  );

  if (loading) {
    return <PeersComparisonLoading />;
  }

  if (error) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-8">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
      </section>
    );
  }

  if (!data) {
    return <PeersComparisonLoading />;
  }

  if (data.status === "insufficient_peers") {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 py-8">
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
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void refetch({ refresh: true })}
          >
            Refresh peers
          </Button>
      </section>
    );
  }

  return (
    <PeersComparisonCard
      targetTicker={ticker}
      bundle={data.bundle}
      onRefresh={() => void refetch({ refresh: true })}
    />
  );
}
