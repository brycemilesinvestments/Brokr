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
