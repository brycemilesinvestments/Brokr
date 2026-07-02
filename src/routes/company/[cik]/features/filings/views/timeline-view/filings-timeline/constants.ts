import type { CoreFormCategory } from "@/lib/edgar/core-forms";

export const CATEGORY_STYLES: Record<CoreFormCategory, { badge: string; dot: string }> = {
  "10-K": { badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  "10-Q": { badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  "8-K": { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  "DEF 14A": { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
};
