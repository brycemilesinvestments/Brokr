const RATIO_METRICS = new Set([
  "gross_margin",
  "operating_margin",
  "net_margin",
  "current_ratio",
  "debt_to_equity",
  "return_on_equity",
]);

const EPS_METRICS = new Set(["EarningsPerShareBasic", "EarningsPerShareDiluted"]);

function isRatioMetric(metric: string): boolean {
  return RATIO_METRICS.has(metric);
}

export function formatMetricValue(metric: string, value: number): string {
  if (RATIO_METRICS.has(metric)) {
    if (metric.includes("margin") || metric === "return_on_equity") {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  }

  if (EPS_METRICS.has(metric)) {
    return `$${value.toFixed(2)}`;
  }

  if (metric.includes("Shares") || metric === "EntityCommonStockSharesOutstanding") {
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

export function formatAxisDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
