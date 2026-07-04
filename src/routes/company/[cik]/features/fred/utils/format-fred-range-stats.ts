import { formatFredValue } from "@/lib/fred";

export function formatFredLatestDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatFredRangeChange(change: number, units: string | null): string {
  const unitsLower = units?.toLowerCase() ?? "";
  const abs = Math.abs(change);
  const sign = change >= 0 ? "+" : "-";

  if (unitsLower.includes("percent")) {
    return `${sign}${abs.toFixed(2)} pp`;
  }

  return `${sign}${formatFredValue(abs, units)}`;
}
