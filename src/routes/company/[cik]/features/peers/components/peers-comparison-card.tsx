"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PeerComparisonBundle } from "@/lib/peers/types";
import { PeerMetricRow } from "@/routes/company/[cik]/features/peers/components/peer-metric-row";
import { PeerTickerChip } from "@/routes/company/[cik]/features/peers/components/peer-ticker-chip";
import { buildPeerChips } from "@/routes/company/[cik]/features/peers/lib/build-peer-chips";
import { buildPeerMetricRows } from "@/routes/company/[cik]/features/peers/lib/build-peer-metric-rows";

type PeersComparisonCardProps = {
  targetTicker?: string;
  bundle: PeerComparisonBundle;
  onRefresh?: () => void;
};

export function PeersComparisonCard({
  targetTicker,
  bundle,
  onRefresh,
}: PeersComparisonCardProps) {
  const [selectedPeerCiks, setSelectedPeerCiks] = useState<Set<string>>(() => new Set());

  const chips = useMemo(() => buildPeerChips(bundle, targetTicker), [bundle, targetTicker]);
  const targetChip = chips.find((chip) => chip.isTarget);
  const peerChips = chips.filter((chip) => !chip.isTarget);

  const selectedForChart = selectedPeerCiks.size > 0 ? selectedPeerCiks : undefined;
  const { rows, calendarKey } = useMemo(
    () => buildPeerMetricRows(bundle, targetTicker, selectedForChart),
    [bundle, targetTicker, selectedForChart],
  );

  const displayTicker = targetTicker?.toUpperCase() ?? "Target";
  const calendarLabel = calendarKey ? `FY${calendarKey}` : "latest FY";

  const togglePeer = (cik: string) => {
    setSelectedPeerCiks((current) => {
      const next = new Set(current);
      if (next.has(cik)) {
        next.delete(cik);
      } else {
        next.add(cik);
      }
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-600">
                Peer comparison
              </p>
              {onRefresh ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0 text-[10px] font-medium text-zinc-500"
                  onClick={onRefresh}
                >
                  Refresh
                </Button>
              ) : null}
            </div>
            <h2 className="mt-1 text-[15px] font-semibold text-zinc-900">
              {displayTicker} vs {bundle.peerSet.peers.length}-company peer set · {calendarLabel}
            </h2>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 overflow-x-auto">
            {targetChip ? <PeerTickerChip chip={targetChip} /> : null}
            {peerChips.length > 0 ? (
              <>
                <div className="h-5 w-px shrink-0 bg-zinc-200" aria-hidden />
                <div className="flex items-center gap-1.5">
                  {peerChips.map((chip) => (
                    <PeerTickerChip
                      key={chip.key}
                      chip={chip}
                      selected={selectedPeerCiks.has(chip.key)}
                      onClick={() => togglePeer(chip.key)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[118px_1fr_116px] items-end gap-x-3.5 px-6 pb-1 pt-3">
        <div />
        <div />
        <p className="text-right font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
          Target · median
        </p>
      </div>

      <div className="px-6 pb-4">
        {rows.map((row) => (
          <PeerMetricRow key={row.metricKey} row={row} />
        ))}
      </div>
    </section>
  );
}
