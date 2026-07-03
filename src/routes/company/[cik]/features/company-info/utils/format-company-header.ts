import type { CompanyInfo } from "@/routes/company/[cik]/types";

const INCORP_STATE_LABELS: Record<string, string> = {
  DE: "Del.",
  NY: "N.Y.",
  CA: "Calif.",
  TX: "Tex.",
  FL: "Fla.",
  PA: "Pa.",
  IL: "Ill.",
  OH: "Ohio",
  NJ: "N.J.",
  WA: "Wash.",
  MA: "Mass.",
  MD: "Md.",
  VA: "Va.",
  NV: "Nev.",
};

export function companyInitials(name: string): string {
  const words = name
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function formatDisplayCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}

export function formatFiscalYearEnd(mmd?: string): string | undefined {
  if (!mmd || mmd.length !== 4) return mmd;

  const month = Number.parseInt(mmd.slice(0, 2), 10) - 1;
  const day = Number.parseInt(mmd.slice(2, 4), 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return mmd;

  const date = new Date(Date.UTC(2000, month, day));
  if (Number.isNaN(date.getTime())) return mmd;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function parseCityState(addressLines: string[]): { city?: string; state?: string } {
  const lastLine = addressLines.at(-1);
  if (!lastLine) return {};

  const match = lastLine.match(/^(.+?)\s+([A-Z]{2})\s+\d{5}(?:-\d{4})?$/);
  if (!match) return {};

  return {
    city: match[1].trim(),
    state: match[2],
  };
}

export function formatIncorporationState(state?: string): string | undefined {
  if (!state) return undefined;
  return INCORP_STATE_LABELS[state] ?? state;
}

export function formatCompanyLocation(info: CompanyInfo): string | undefined {
  const { city, state: addressState } = parseCityState(info.businessAddress);
  const state = addressState ?? info.state;
  const incorporation = formatIncorporationState(info.stateOfIncorporation);

  const cityState = city && state ? `${city}, ${state}` : state ?? city;
  if (!cityState) return undefined;
  if (!incorporation) return cityState;

  return `${cityState} · ${incorporation}`;
}

export function formatBusinessAddressLine(addressLines: string[]): string | undefined {
  const lines = addressLines.filter(Boolean);
  if (lines.length === 0) return undefined;
  return lines.join(", ");
}

export function formatHeaderPrice(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatHeaderChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
