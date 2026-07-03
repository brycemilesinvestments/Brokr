export type PeerPalette = {
  chipText: string;
  chipBorder: string;
  bar: string;
};

export const PEER_CHART_COLORS: PeerPalette[] = [
  { chipText: "text-blue-600", chipBorder: "border-zinc-200", bar: "bg-blue-600" },
  { chipText: "text-violet-600", chipBorder: "border-zinc-200", bar: "bg-violet-600" },
  { chipText: "text-teal-600", chipBorder: "border-zinc-200", bar: "bg-teal-600" },
  { chipText: "text-amber-600", chipBorder: "border-zinc-200", bar: "bg-amber-600" },
  { chipText: "text-pink-600", chipBorder: "border-zinc-200", bar: "bg-pink-600" },
  { chipText: "text-cyan-600", chipBorder: "border-zinc-200", bar: "bg-cyan-600" },
  { chipText: "text-orange-600", chipBorder: "border-zinc-200", bar: "bg-orange-600" },
];

export function getPeerPalette(index: number): PeerPalette {
  return PEER_CHART_COLORS[index % PEER_CHART_COLORS.length]!;
}
