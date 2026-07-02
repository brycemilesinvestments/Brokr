import type { Financials, Ratios } from "@/lib/analysis/types";

export function safeDivide(numerator?: number, denominator?: number): number | undefined {
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }
  return numerator / denominator;
}

export function computeRatios(financials: Financials): Ratios {
  return {
    grossMargin: safeDivide(financials.grossProfit, financials.revenue),
    operatingMargin: safeDivide(financials.operatingIncome, financials.revenue),
    netMargin: safeDivide(financials.netIncome, financials.revenue),
    debtToEquity: safeDivide(financials.totalLiabilities, financials.stockholdersEquity),
    returnOnEquity: safeDivide(financials.netIncome, financials.stockholdersEquity),
    currentRatio: safeDivide(financials.totalAssets, financials.totalLiabilities),
  };
}
