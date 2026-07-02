import type { XbrlFact } from "@/lib/edgar/xbrl/types";

export function formatPeriod(fact: XbrlFact): string {
  const context = fact.context;
  if (!context) return fact.contextRef;
  if (context.periodType === "instant") return context.instant ?? fact.contextRef;
  if (context.startDate && context.endDate) {
    return `${context.startDate} → ${context.endDate}`;
  }
  return fact.contextRef;
}
