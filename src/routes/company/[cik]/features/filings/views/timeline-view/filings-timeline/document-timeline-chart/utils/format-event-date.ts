export function formatEventDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  const month = parsed.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = parsed.getUTCDate();
  const year = String(parsed.getUTCFullYear() % 100).padStart(2, "0");

  return `${month} ${day}, '${year}`;
}

export function formatPriceImpact(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
