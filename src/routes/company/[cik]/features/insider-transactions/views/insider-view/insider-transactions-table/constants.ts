export const LEDGER_GRID_CLASS =
  "grid grid-cols-[98px_minmax(180px,1fr)_152px_176px_106px_52px] items-center gap-x-3.5";

export type LedgerAdFilter = "all" | "acquired" | "disposed";

export const LEDGER_AD_FILTERS: Array<{ value: LedgerAdFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "acquired", label: "Acquired" },
  { value: "disposed", label: "Disposed" },
];

export const MOVEMENT_COLORS = {
  acquired: "#047857",
  disposed: "#dc2626",
} as const;
