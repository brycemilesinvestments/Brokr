import { PeerPercentileBar } from "@/routes/company/[cik]/features/peers/components/peer-percentile-bar";
import type { PeerMetricRowModel } from "@/routes/company/[cik]/features/peers/lib/build-peer-metric-rows";
import { PERCENTILE_TONE_STYLES } from "@/routes/company/[cik]/features/peers/utils/get-percentile-tone";

type PeerMetricRowProps = {
  row: PeerMetricRowModel;
};

export function PeerMetricRow({ row }: PeerMetricRowProps) {
  const toneStyles = PERCENTILE_TONE_STYLES[row.tone];

  return (
    <div className="grid grid-cols-[118px_1fr_116px] items-center gap-x-3.5 border-t border-zinc-100 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-[12.5px] font-semibold text-zinc-900">
            {row.label}
          </span>
          {row.divergenceTitle ? (
            <span className="text-[11px]" title={row.divergenceTitle} aria-label={row.divergenceTitle}>
              ⚠️
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10px] text-zinc-400">
          n={row.peerCount} · {row.rank}th pctile
        </p>
      </div>

      <div className="min-w-0">
        <PeerPercentileBar
          targetPosition={row.targetPosition}
          zeroPosition={row.zeroPosition}
          peerMarkers={row.peerMarkers}
        />
        <div className="relative mt-1 h-3.5">
          <span className="absolute bottom-0 left-0 font-mono text-[9px] font-semibold text-zinc-400">
            {row.scaleMinFormatted}
          </span>
          {row.zeroPosition !== null ? (
            <span
              className="absolute bottom-0 -translate-x-1/2 font-mono text-[9px] font-semibold text-zinc-500"
              style={{ left: `${row.zeroPosition}%` }}
            >
              0
            </span>
          ) : null}
          <span className="absolute bottom-0 right-0 font-mono text-[9px] font-semibold text-zinc-400">
            {row.scaleMaxFormatted}
          </span>
        </div>
      </div>

      <div className="whitespace-nowrap text-right font-mono">
        <span className={`text-[12.5px] font-bold ${toneStyles.value}`}>{row.targetFormatted}</span>
        <span className="text-[11px] text-zinc-400"> · {row.medianFormatted}</span>
      </div>
    </div>
  );
}
