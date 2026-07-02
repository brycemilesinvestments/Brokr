import type { CoreFormCategory } from "@/lib/edgar/core-forms";
import type { FredCategory } from "@/lib/fred/constants";

export const CATEGORY_STYLES: Record<CoreFormCategory, { badge: string; dot: string }> = {
  "10-K": { badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  "10-Q": { badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  "8-K": { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  "DEF 14A": { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
};

export const FRED_CATEGORY_STYLES: Record<FredCategory, { badge: string; dot: string }> = {
  Employment: { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  Inflation: { badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  "Interest Rates": { badge: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  "GDP & Growth": { badge: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500" },
  Consumer: { badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  "Business & Capex": { badge: "bg-lime-100 text-lime-800", dot: "bg-lime-500" },
  Housing: { badge: "bg-amber-100 text-amber-900", dot: "bg-amber-600" },
  "Credit & Financial Conditions": {
    badge: "bg-fuchsia-100 text-fuchsia-800",
    dot: "bg-fuchsia-500",
  },
  "Trade & Dollar": { badge: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  "Leading Indicators": { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
};

export const FRED_MARKER_COLOR = "#4f46e5";
