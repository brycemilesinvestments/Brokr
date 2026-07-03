import type { PeerMarkerModel } from "@/routes/company/[cik]/features/peers/lib/build-peer-metric-rows";

type PeerPercentileBarProps = {
  targetPosition: number;
  zeroPosition: number | null;
  peerMarkers: PeerMarkerModel[];
};

export function PeerPercentileBar({
  targetPosition,
  zeroPosition,
  peerMarkers,
}: PeerPercentileBarProps) {
  return (
    <div className="relative h-[18px] rounded-md bg-zinc-100">
      {zeroPosition !== null ? (
        <div
          className="absolute bottom-[-4px] top-[-4px] w-px bg-zinc-400"
          style={{ left: `${zeroPosition}%` }}
          aria-hidden
        />
      ) : null}
      {peerMarkers.map((marker) => (
        <div
          key={marker.ticker}
          title={marker.ticker}
          className={`absolute top-[-2px] bottom-[-2px] w-0.5 -translate-x-1/2 rounded-sm ${marker.barColorClass}`}
          style={{ left: `${marker.position}%` }}
          aria-hidden
        />
      ))}
      <div
        className="absolute top-1/2 z-[2] size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-zinc-900 shadow-md"
        style={{ left: `${targetPosition}%` }}
        aria-hidden
      />
    </div>
  );
}
