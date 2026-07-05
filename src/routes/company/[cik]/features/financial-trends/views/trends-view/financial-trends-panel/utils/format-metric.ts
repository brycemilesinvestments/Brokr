import type { MetricPolarity } from "@/lib/metrics/polarity/types";
import {
  deltaToneForPolarity,
  guessPolarityFromMetricKey,
} from "@/lib/metrics/polarity";

const RATIO_METRICS = new Set([
  "gross_margin",
  "operating_margin",
  "net_margin",
  "current_ratio",
  "debt_to_equity",
  "return_on_equity",
]);

const VALUATION_MULTIPLES = new Set(["pe", "p_fcf", "ev_sales", "ev_ebitda"]);

const PERCENTAGE_DERIVED = new Set([
  "fcf_margin",
  "capex_intensity",
  "sbc_pct_revenue",
]);

const EPS_METRICS = new Set(["EarningsPerShareBasic", "EarningsPerShareDiluted"]);

export function formatMetricValue(metric: string, value: number): string {
  if (VALUATION_MULTIPLES.has(metric)) {
    return `${value.toFixed(1)}x`;
  }

  if (RATIO_METRICS.has(metric)) {
    if (metric.includes("margin") || metric === "return_on_equity") {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  }

  if (PERCENTAGE_DERIVED.has(metric)) {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (EPS_METRICS.has(metric)) {
    return `$${value.toFixed(2)}`;
  }

  if (
    metric.includes("Shares") ||
    metric === "EntityCommonStockSharesOutstanding" ||
    metric === "share_count_trend"
  ) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    return value.toLocaleString();
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatDeltaPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  const pct = value * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

const POINT_CHANGE_METRICS = new Set([
  "gross_margin",
  "operating_margin",
  "net_margin",
  "fcf_margin",
  "capex_intensity",
]);

export function formatMetricDelta(metric: string, deltaYoy: number | undefined): string | null {
  if (deltaYoy === undefined || Number.isNaN(deltaYoy)) return null;

  if (POINT_CHANGE_METRICS.has(metric)) {
    const pp = deltaYoy * 100;
    const sign = pp >= 0 ? "+" : "";
    return `${sign}${pp.toFixed(1)}pp`;
  }

  return formatDeltaPercent(deltaYoy);
}

export function deltaToneForMetric(
  metric: string,
  deltaYoy: number | undefined,
  polarity?: MetricPolarity,
): "positive" | "negative" | "neutral" {
  return deltaToneForPolarity(
    polarity ?? guessPolarityFromMetricKey(metric),
    deltaYoy,
  );
}

export function formatAxisDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
