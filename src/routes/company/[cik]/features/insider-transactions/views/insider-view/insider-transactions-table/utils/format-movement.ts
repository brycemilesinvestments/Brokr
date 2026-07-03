export function formatMovement(shares: number | undefined, acquiredOrDisposed?: "A" | "D"): string {
  if (shares === undefined) return "—";
  const formatted = shares.toLocaleString("en-US");
  if (acquiredOrDisposed === "A") return `+${formatted}`;
  if (acquiredOrDisposed === "D") return `−${formatted}`;
  return formatted;
}
