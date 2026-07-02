import type { SortButtonProps } from "../types";

export function SortButton({ active, onClick, children }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
