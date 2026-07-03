import { formatFredValue } from "@/lib/fred";

export function formatFredAxisDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function formatFredChartValue(value: number, units: string | null): string {
  return formatFredValue(value, units);
}
