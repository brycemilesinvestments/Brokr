import type { PeerComparisonBundle } from "@/lib/peers/types";
import { getPeerPalette } from "@/routes/company/[cik]/features/peers/utils/peer-palette";

export type PeerChipModel = {
  key: string;
  ticker: string;
  isTarget: boolean;
  palette: ReturnType<typeof getPeerPalette>;
};

function chipTicker(ticker?: string, entityName?: string): string {
  if (ticker) return ticker.toUpperCase();
  if (!entityName) return "—";
  return entityName.split(/\s+/)[0]?.toUpperCase() ?? entityName;
}

export function buildPeerChips(
  bundle: PeerComparisonBundle,
  targetTicker?: string,
): PeerChipModel[] {
  const targetLabel = chipTicker(targetTicker, bundle.targetEntityName);

  const chips: PeerChipModel[] = [
    {
      key: bundle.targetCik,
      ticker: targetLabel,
      isTarget: true,
      palette: {
        chipText: "text-white",
        chipBorder: "border-zinc-900",
        bar: "bg-zinc-900",
      },
    },
  ];

  bundle.peerSet.peers.forEach((peer, index) => {
    chips.push({
      key: peer.cik,
      ticker: chipTicker(peer.ticker, peer.entityName),
      isTarget: false,
      palette: getPeerPalette(index),
    });
  });

  return chips;
}

export function buildPeerColorByCik(chips: PeerChipModel[]): Map<string, PeerChipModel> {
  return new Map(chips.map((chip) => [chip.key, chip]));
}
