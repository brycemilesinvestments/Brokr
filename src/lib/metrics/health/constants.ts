/**
 * Health score constants: default weights, piecewise breakpoints, and framing.
 * All margin/ratio breakpoints are in decimal form (0.20 = 20%).
 */
import type { CompositeWeights, FramingLabel } from "@/lib/metrics/health/types";
import type { Breakpoint } from "@/lib/metrics/health/score-utils";

// ── Composite weights ─────────────────────────────────────────────────────────

/** Default composite weights — must sum to 1.0. Tests assert this invariant. */
export const DEFAULT_WEIGHTS: CompositeWeights = {
  profitability: 0.25,
  growth_quality: 0.20,
  balance_sheet: 0.20,
  cash_generation: 0.20,
  dilution: 0.15,
};

// ── Profitability breakpoints (decimal ratios) ────────────────────────────────

const NET_MARGIN_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.20, 0],
  [-0.05, 20],
  [0.0, 30],
  [0.05, 50],
  [0.10, 65],
  [0.20, 82],
  [0.30, 100],
];

const GROSS_MARGIN_BREAKPOINTS: readonly Breakpoint[] = [
  [0.0, 0],
  [0.20, 30],
  [0.40, 55],
  [0.60, 78],
  [0.80, 100],
];

const OPERATING_MARGIN_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.10, 0],
  [0.0, 28],
  [0.05, 50],
  [0.15, 70],
  [0.25, 100],
];

const RETURN_ON_EQUITY_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.20, 0],
  [0.0, 28],
  [0.10, 50],
  [0.20, 72],
  [0.30, 100],
];

// ── Growth quality breakpoints ────────────────────────────────────────────────

/** Revenue YoY growth rate (decimal). Peak score around 10-20% sustainable growth. */
export const REVENUE_GROWTH_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.20, 0],
  [-0.05, 15],
  [0.0, 30],
  [0.05, 50],
  [0.10, 70],
  [0.20, 90],
  [0.40, 95],
  [1.0, 85],
];

/** Operating margin as growth quality signal (sustainable margin = quality growth). */
export const GROWTH_OPERATING_MARGIN_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.05, 10],
  [0.0, 30],
  [0.05, 50],
  [0.15, 75],
  [0.25, 100],
];

// ── Balance sheet breakpoints ─────────────────────────────────────────────────

const CURRENT_RATIO_BREAKPOINTS: readonly Breakpoint[] = [
  [0.5, 0],
  [1.0, 40],
  [1.5, 65],
  [2.0, 80],
  [3.0, 90],
  [5.0, 75],
];

const DEBT_TO_EQUITY_BREAKPOINTS: readonly Breakpoint[] = [
  [0.0, 100],
  [0.5, 85],
  [1.0, 65],
  [2.0, 40],
  [4.0, 15],
  [8.0, 0],
];

// ── Cash generation breakpoints ───────────────────────────────────────────────

const FCF_MARGIN_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.20, 0],
  [-0.05, 15],
  [0.0, 30],
  [0.05, 50],
  [0.10, 65],
  [0.20, 85],
  [0.30, 100],
];

/** Capex intensity (|Capex|/Revenue). Lower = better for asset-light. */
const CAPEX_INTENSITY_BREAKPOINTS: readonly Breakpoint[] = [
  [0.0, 100],
  [0.05, 85],
  [0.10, 70],
  [0.20, 50],
  [0.30, 30],
  [0.50, 10],
  [0.70, 0],
];

// ── Dilution breakpoints ──────────────────────────────────────────────────────

/** SBC as % of revenue (decimal). Lower = less dilutive. */
const SBC_PCT_REVENUE_BREAKPOINTS: readonly Breakpoint[] = [
  [0.0, 100],
  [0.02, 90],
  [0.05, 70],
  [0.10, 45],
  [0.15, 20],
  [0.25, 0],
];

/** Share count YoY trend (decimal change). Negative = buybacks (good). */
const SHARE_COUNT_TREND_BREAKPOINTS: readonly Breakpoint[] = [
  [-0.05, 100],
  [0.0, 80],
  [0.02, 65],
  [0.05, 45],
  [0.10, 20],
  [0.15, 0],
];

// ── Framing ───────────────────────────────────────────────────────────────────

export const HEALTH_FRAMING: FramingLabel = {
  type: "diagnostic",
  text: "This health score is a quantitative diagnostic tool based on publicly reported financial data. Scores reflect relative positioning across five dimensions: Profitability, Growth Quality, Balance Sheet, Cash Generation, and Dilution.",
  disclaimer:
    "NOT INVESTMENT ADVICE. This score is an automated diagnostic intended to support—not replace—independent financial analysis. It does not constitute a recommendation to buy, hold, or sell any security, and is not a prediction of future performance. Past financial metrics do not guarantee future results.",
};
