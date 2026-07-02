export function formatShares(value?: number): string {
  if (value === undefined) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
