export type TransactionTypeStyle = {
  badgeLabel: string;
  subtitle: string;
  dotColor: string;
  badgeClassName: string;
};

const TYPE_NAMES: Record<string, string> = {
  A: "Award",
  C: "Conversion",
  D: "Return",
  E: "Expire",
  F: "InKind",
  G: "Gift",
  H: "Expire",
  I: "Discretionary",
  J: "Other",
  L: "Small",
  M: "Exercise",
  O: "Exercise",
  P: "Purchase",
  S: "Sale",
  U: "Tender",
  W: "Will",
  X: "Exercise",
  Z: "Trust",
};

const TYPE_SUBTITLES: Record<string, string> = {
  A: "Grant / award",
  F: "Tax withholding",
  G: "Gift",
  J: "Other",
  M: "Option exercise",
  P: "Open-market purchase",
  S: "Open-market sale",
};

const TYPE_STYLES: Record<string, Omit<TransactionTypeStyle, "badgeLabel" | "subtitle">> = {
  A: {
    dotColor: "#047857",
    badgeClassName: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  F: {
    dotColor: "#d97706",
    badgeClassName: "bg-amber-50 border-amber-200 text-amber-600",
  },
  G: {
    dotColor: "#7c3aed",
    badgeClassName: "bg-violet-50 border-violet-200 text-violet-600",
  },
  J: {
    dotColor: "#475569",
    badgeClassName: "bg-slate-100 border-slate-300 text-slate-600",
  },
  S: {
    dotColor: "#dc2626",
    badgeClassName: "bg-red-50 border-red-200 text-red-600",
  },
};

const DEFAULT_STYLE: Omit<TransactionTypeStyle, "badgeLabel" | "subtitle"> = {
  dotColor: "#475569",
  badgeClassName: "bg-slate-100 border-slate-300 text-slate-600",
};

function typeCode(transactionType?: string): string {
  const trimmed = transactionType?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.includes("-")) return trimmed.split("-")[0]?.toUpperCase() ?? "";
  return trimmed.charAt(0).toUpperCase();
}

function badgeLabel(transactionType?: string): string {
  const trimmed = transactionType?.trim();
  if (!trimmed) return "—";
  if (trimmed.includes("-")) return trimmed;

  const code = typeCode(trimmed);
  const name = TYPE_NAMES[code];
  return name ? `${code}-${name}` : trimmed;
}

export function getTransactionTypeStyle(transactionType?: string): TransactionTypeStyle {
  const code = typeCode(transactionType);
  const style = TYPE_STYLES[code] ?? DEFAULT_STYLE;
  const name = TYPE_NAMES[code];

  return {
    badgeLabel: badgeLabel(transactionType),
    subtitle: TYPE_SUBTITLES[code] ?? name ?? transactionType?.trim() ?? "—",
    ...style,
  };
}
