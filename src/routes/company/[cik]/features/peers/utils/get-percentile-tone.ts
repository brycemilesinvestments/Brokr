export type PercentileTone = "low" | "mid" | "high";

const FLOOR_THRESHOLD = 25;
const LEAD_THRESHOLD = 75;

export function getPercentileTone(rank: number): PercentileTone {
  if (rank <= FLOOR_THRESHOLD) return "low";
  if (rank >= LEAD_THRESHOLD) return "high";
  return "mid";
}

export const PERCENTILE_TONE_STYLES: Record<
  PercentileTone,
  { dot: string; value: string }
> = {
  low: {
    dot: "bg-red-600",
    value: "text-red-600",
  },
  mid: {
    dot: "bg-amber-600",
    value: "text-amber-600",
  },
  high: {
    dot: "bg-emerald-600",
    value: "text-emerald-600",
  },
};
