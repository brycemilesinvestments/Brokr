import type { Delta, Financials } from "@/lib/analysis/types";
import { safeDivide } from "@/lib/analysis/ratios";

function deltaForMetric(
  metric: string,
  current?: number,
  prior?: number,
): Delta {
  const absoluteChange =
    current !== undefined && prior !== undefined ? current - prior : undefined;
  const ratioChange = safeDivide(absoluteChange, prior);

  return { metric, current, prior, absoluteChange, ratioChange };
}

export function computeDeltas(financials: Financials): Delta[] {
  const pairs: Array<[string, number | undefined, number | undefined]> = [
    ["revenue", financials.revenue, financials.priorRevenue],
    ["grossProfit", financials.grossProfit, financials.priorGrossProfit],
  ];

  return pairs.map(([metric, current, prior]) => deltaForMetric(metric, current, prior));
}

export function revenueYoYRatio(financials: Financials): number | undefined {
  return safeDivide(financials.revenue, financials.priorRevenue);
}
