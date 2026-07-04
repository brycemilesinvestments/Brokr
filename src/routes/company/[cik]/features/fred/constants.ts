import type { FredCategory } from "@/lib/fred/constants";

export type FredAnalyticsCategoryStyle = {
  label: string;
  color: string;
  badge: string;
  dot: string;
  selectedBg: string;
  selectedRing: string;
};

export const FRED_ANALYTICS_CATEGORY_STYLES: Record<FredCategory, FredAnalyticsCategoryStyle> = {
  "GDP & Growth": {
    label: "Growth",
    color: "#4f46e5",
    badge: "bg-indigo-500/10 text-indigo-600",
    dot: "bg-indigo-600",
    selectedBg: "bg-indigo-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(79,70,229,0.25)]",
  },
  Inflation: {
    label: "Inflation",
    color: "#e11d48",
    badge: "bg-rose-600/10 text-rose-600",
    dot: "bg-rose-600",
    selectedBg: "bg-rose-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(225,29,72,0.25)]",
  },
  Employment: {
    label: "Labor",
    color: "#059669",
    badge: "bg-emerald-600/10 text-emerald-600",
    dot: "bg-emerald-600",
    selectedBg: "bg-emerald-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(5,150,105,0.25)]",
  },
  "Interest Rates": {
    label: "Rates",
    color: "#7c3aed",
    badge: "bg-violet-600/10 text-violet-600",
    dot: "bg-violet-600",
    selectedBg: "bg-violet-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(124,58,237,0.25)]",
  },
  Housing: {
    label: "Housing",
    color: "#d97706",
    badge: "bg-amber-600/10 text-amber-600",
    dot: "bg-amber-600",
    selectedBg: "bg-amber-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.25)]",
  },
  Consumer: {
    label: "Consumer",
    color: "#0891b2",
    badge: "bg-cyan-600/10 text-cyan-600",
    dot: "bg-cyan-600",
    selectedBg: "bg-cyan-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(8,145,178,0.25)]",
  },
  "Business & Capex": {
    label: "Business",
    color: "#84cc16",
    badge: "bg-lime-600/10 text-lime-700",
    dot: "bg-lime-600",
    selectedBg: "bg-lime-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(132,204,22,0.25)]",
  },
  "Credit & Financial Conditions": {
    label: "Credit",
    color: "#d946ef",
    badge: "bg-fuchsia-600/10 text-fuchsia-600",
    dot: "bg-fuchsia-600",
    selectedBg: "bg-fuchsia-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(217,70,239,0.25)]",
  },
  "Trade & Dollar": {
    label: "Trade",
    color: "#14b8a6",
    badge: "bg-teal-600/10 text-teal-600",
    dot: "bg-teal-600",
    selectedBg: "bg-teal-600/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(20,184,166,0.25)]",
  },
  "Leading Indicators": {
    label: "Leading",
    color: "#8b5cf6",
    badge: "bg-violet-500/10 text-violet-600",
    dot: "bg-violet-500",
    selectedBg: "bg-violet-500/[0.07]",
    selectedRing: "shadow-[inset_0_0_0_1.5px_rgba(139,92,246,0.25)]",
  },
};

export const FRED_ANALYTICS_FALLBACK_STYLE: FredAnalyticsCategoryStyle =
  FRED_ANALYTICS_CATEGORY_STYLES["Leading Indicators"];

export const FRED_ANALYTICS_TIME_RANGE_OPTIONS = ["1Y", "3Y", "5Y", "MAX"] as const;
