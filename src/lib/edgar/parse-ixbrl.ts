import type { XbrlFact, XbrlContext } from "@/lib/edgar/xbrl/types";

/**
 * Advanced iXBRL parsing utilities beyond basic extraction.
 * Handles aggregation, filtering, and metric computation.
 */

export interface ParsedFinancialStatement {
  periodEndDate: string;
  facts: Map<string, XbrlFact>;
}

export interface ParsedFinancialMetrics {
  revenue?: number;
  grossProfit?: number;
  grossMargin?: number;
  operatingIncome?: number;
  operatingMargin?: number;
  netIncome?: number;
  netMargin?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  stockholdersEquity?: number;
  sharesOutstanding?: number;
  bookValuePerShare?: number;
}

/**
 * Group XBRL facts by reporting period.
 * Combines instant and duration contexts for a single period.
 */
function groupFactsByPeriod(
  facts: XbrlFact[],
  contexts: XbrlContext[],
): Map<string, XbrlFact[]> {
  const periods = new Map<string, XbrlFact[]>();
  const contextById = new Map(contexts.map((context) => [context.id, context]));

  for (const fact of facts) {
    const context = contextById.get(fact.contextRef);
    if (!context) continue;

    const periodKey = context.instant || context.endDate || "unknown";
    const existing = periods.get(periodKey) || [];
    existing.push(fact);
    periods.set(periodKey, existing);
  }

  return periods;
}

/**
 * Build a parsed financial statement for a single period.
 * Maps concept names to facts for easy lookup.
 */
function buildStatement(facts: XbrlFact[]): ParsedFinancialStatement {
  const firstFact = facts[0];
  if (!firstFact?.context) {
    throw new Error("No facts with context available");
  }

  const periodEndDate = firstFact.context.instant || firstFact.context.endDate || "";
  const conceptMap = new Map<string, XbrlFact>();

  for (const fact of facts) {
    const key = fact.concept;
    if (!conceptMap.has(key) || (fact.numericValue !== undefined && !conceptMap.get(key)?.numericValue)) {
      conceptMap.set(key, fact);
    }
  }

  return {
    periodEndDate,
    facts: conceptMap,
  };
}

/**
 * Extract common financial metrics from a parsed statement.
 * Returns computed metrics (ratios, margins, etc.).
 */
function extractMetrics(statement: ParsedFinancialStatement): ParsedFinancialMetrics {
  const fact = (concept: string) => statement.facts.get(concept);
  const value = (concept: string) => fact(concept)?.numericValue;

  const revenue = value("Revenues") || value("ProductRevenues") || value("ServiceRevenue");
  const grossProfit = value("GrossProfit");
  const operatingIncome = value("OperatingIncome");
  const netIncome = value("NetIncomeLoss");
  const totalAssets = value("Assets");
  const totalLiabilities = value("Liabilities");
  const equity = value("StockholdersEquity");
  const shares = value("EntityCommonStockSharesOutstanding") || value("WeightedAverageNumberOfSharesOutstandingBasic");

  return {
    revenue,
    grossProfit,
    grossMargin: revenue && grossProfit ? grossProfit / revenue : undefined,
    operatingIncome,
    operatingMargin: revenue && operatingIncome ? operatingIncome / revenue : undefined,
    netIncome,
    netMargin: revenue && netIncome ? netIncome / revenue : undefined,
    totalAssets,
    totalLiabilities,
    stockholdersEquity: equity,
    sharesOutstanding: shares,
    bookValuePerShare: equity && shares ? equity / shares : undefined,
  };
}

/**
 * Compare two periods' metrics to calculate changes.
 */
export interface MetricChange {
  current: number | undefined;
  prior: number | undefined;
  change: number | undefined;
  changePercent: number | undefined;
}

function compareMetrics(
  current: ParsedFinancialMetrics,
  prior: ParsedFinancialMetrics,
): Record<keyof ParsedFinancialMetrics, MetricChange> {
  const metrics = Object.keys(current) as (keyof ParsedFinancialMetrics)[];
  const result: Record<keyof ParsedFinancialMetrics, MetricChange> = {} as any;

  for (const metric of metrics) {
    const curr = current[metric];
    const prev = prior[metric];
    const change = curr !== undefined && prev !== undefined ? curr - prev : undefined;
    const changePercent = prev && prev !== 0 && change !== undefined ? change / prev : undefined;

    result[metric] = {
      current: curr,
      prior: prev,
      change,
      changePercent,
    };
  }

  return result;
}
