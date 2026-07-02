import type { XbrlFact } from "@/lib/edgar/xbrl/types";

export function formatFactValue(fact?: XbrlFact): string {
  if (!fact) return "—";
  if (fact.numericValue !== undefined) {
    const formatted = fact.numericValue.toLocaleString("en-US", {
      maximumFractionDigits: 6,
    });
    return fact.unit ? `${formatted} ${fact.unit}` : formatted;
  }
  if (!fact.value || fact.value === "—") return "—";
  return fact.value;
}
