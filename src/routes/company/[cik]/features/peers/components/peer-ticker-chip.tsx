import type { PeerChipModel } from "@/routes/company/[cik]/features/peers/lib/build-peer-chips";

type PeerTickerChipProps = {
  chip: PeerChipModel;
  selected?: boolean;
  onClick?: () => void;
};

export function PeerTickerChip({ chip, selected = false, onClick }: PeerTickerChipProps) {
  if (chip.isTarget) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
        <span className="size-[7px] rounded-full bg-white" aria-hidden />
        {chip.ticker}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold transition-colors ${chip.palette.chipBorder} ${chip.palette.chipText} ${
        selected
          ? "bg-zinc-100 ring-2 ring-zinc-900 ring-offset-1"
          : "bg-white hover:bg-zinc-50"
      }`}
    >
      <span className={`size-[7px] rounded-full ${chip.palette.bar}`} aria-hidden />
      {chip.ticker}
    </button>
  );
}
