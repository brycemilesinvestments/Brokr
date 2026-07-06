import type { CoreFormCategory } from "@/lib/edgar/core-forms";
import type { FredCategory } from "@/lib/fred/constants";

export const CATEGORY_MARKER_COLORS: Record<CoreFormCategory, string> = {
  "10-K": "#1d4ed8",
  "10-Q": "#0284c7",
  "8-K": "#d97706",
  "DEF 14A": "#7c3aed",
};

export const FRED_MARKER_COLORS: Record<FredCategory, string> = {
  Employment: "#0d9488",
  Inflation: "#e11d48",
  "Interest Rates": "#4f46e5",
  "GDP & Growth": "#06b6d4",
  Consumer: "#f97316",
  "Business & Capex": "#84cc16",
  Housing: "#d97706",
  "Credit & Financial Conditions": "#d946ef",
  "Trade & Dollar": "#14b8a6",
  "Leading Indicators": "#8b5cf6",
};

/** Default FRED marker color when category is unknown. */
export const FRED_MARKER_COLOR = FRED_MARKER_COLORS["Interest Rates"];
