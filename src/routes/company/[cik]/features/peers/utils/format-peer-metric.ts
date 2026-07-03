import { PEER_DISPLAY_METRICS } from "@/routes/company/[cik]/features/peers/types";

export type PeerDisplayMetric = (typeof PEER_DISPLAY_METRICS)[number];

export function formatMetricLabel(metricKey: string): string {
  return metricKey.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatPeerMetricValue(metricKey: string, value: number): string {
  if (metricKey === "debt_to_equity") {
    return `${value.toFixed(1)}×`;
  }

  if (metricKey.includes("margin")) {
    const pct = value * 100;
    const abs = Math.abs(pct).toFixed(1);
    return pct < 0 ? `−${abs}%` : `${abs}%`;
  }

  if (metricKey === "current_ratio") {
    return value.toFixed(1);
  }

  return value.toFixed(1);
}

export function metricSummaryLabel(metricKey: string): string {
  const labels: Record<string, string> = {
    gross_margin: "gross margin",
    net_margin: "net margin",
    operating_margin: "operating margin",
    current_ratio: "liquidity (current ratio)",
    debt_to_equity: "leverage (debt / equity)",
    fcf_margin: "free cash flow margin",
  };
  return labels[metricKey] ?? formatMetricLabel(metricKey).toLowerCase();
}
