/** Format a FRED observation for display based on units metadata. */
export function formatFredValue(value: number, units: string | null): string {
  if (!Number.isFinite(value)) return "—";

  const abs = Math.abs(value);
  const unitsLower = units?.toLowerCase() ?? "";

  if (unitsLower.includes("percent")) {
    return `${value.toFixed(2)}%`;
  }

  if (unitsLower.includes("index")) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (abs >= 1_000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
