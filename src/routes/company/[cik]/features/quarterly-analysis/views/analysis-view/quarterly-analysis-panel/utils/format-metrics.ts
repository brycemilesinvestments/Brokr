const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  grossProfit: "Gross profit",
  operatingIncome: "Operating income",
  netIncome: "Net income",
  totalAssets: "Total assets",
  totalLiabilities: "Total liabilities",
  stockholdersEquity: "Stockholders' equity",
  sharesOutstanding: "Shares outstanding",
  grossMargin: "Gross margin",
  operatingMargin: "Operating margin",
  netMargin: "Net margin",
  debtToEquity: "Debt to equity",
  returnOnEquity: "Return on equity",
  currentRatio: "Current ratio",
};

export function formatMetricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function formatCurrency(value?: number): string {
  if (value === undefined) return "—";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatShares(value?: number): string {
  if (value === undefined) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatPercent(value?: number, digits = 1): string {
  if (value === undefined) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDeltaPercent(value?: number): string {
  if (value === undefined) return "—";
  const pct = value * 100;
  const prefix = pct >= 0 ? "+" : "";
  return `${prefix}${pct.toFixed(1)}%`;
}

export function formatRatio(value?: number, digits = 2): string {
  if (value === undefined) return "—";
  return value.toFixed(digits);
}
