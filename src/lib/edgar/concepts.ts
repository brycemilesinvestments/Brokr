import type { XbrlFact } from "@/lib/edgar/xbrl/types";

/**
 * Financial concept keys — standard XBRL concepts for common metrics.
 * Used to filter and group XBRL facts by semantic meaning.
 */
export type FinancialConcept =
  | "Revenue"
  | "GrossProfit"
  | "GrossMargin"
  | "OperatingIncome"
  | "OperatingMargin"
  | "NetIncome"
  | "NetMargin"
  | "Assets"
  | "Liabilities"
  | "Equity"
  | "SharesOutstanding"
  | "EPS";

/**
 * Map XBRL concept names to semantic financial metrics.
 * Handles both standard and shorthand variants.
 * 
 * Example mappings:
 * - us-gaap:Revenues → "Revenue"
 * - us-gaap:GrossProfit → "GrossProfit"
 * - us-gaap:NetIncomeLoss → "NetIncome"
 */
const CONCEPT_MAPPINGS: Record<string, FinancialConcept> = {
  // Revenue
  "us-gaap:Revenues": "Revenue",
  "us-gaap:ProductRevenues": "Revenue",
  "us-gaap:ServiceRevenue": "Revenue",

  // Profit & Margin
  "us-gaap:GrossProfit": "GrossProfit",
  "us-gaap:OperatingIncome": "OperatingIncome",
  "us-gaap:NetIncomeLoss": "NetIncome",

  // Balance sheet
  "us-gaap:Assets": "Assets",
  "us-gaap:Liabilities": "Liabilities",
  "us-gaap:StockholdersEquity": "Equity",

  // Shares
  "us-gaap:EntityCommonStockSharesOutstanding": "SharesOutstanding",
  "us-gaap:WeightedAverageNumberOfSharesOutstandingBasic": "SharesOutstanding",
  "us-gaap:BasicEarningsPerShareCommon": "EPS",
};

/**
 * Filter facts by concept, context period, and optionally context type.
 * Returns latest instant or duration fact for the period.
 */
function findFactsByContext(
  facts: XbrlFact[],
  concept: string,
  options?: {
    contextType?: "instant" | "duration";
    endDate?: string;
    startDate?: string;
  },
): XbrlFact[] {
  return facts.filter((fact) => {
    if (fact.concept !== concept) return false;
    if (options?.contextType && fact.context?.periodType !== options.contextType) {
      return false;
    }
    if (options?.endDate && fact.context?.endDate !== options.endDate) return false;
    if (options?.startDate && fact.context?.startDate !== options.startDate) return false;
    return true;
  });
}

/**
 * Get the latest/most recent fact for a concept.
 * Sorts by context date (instant > endDate) and picks first numeric value.
 */
function getLatestFact(
  facts: XbrlFact[],
  concept: string,
): XbrlFact | undefined {
  const matching = findFactsByContext(facts, concept);
  if (matching.length === 0) return undefined;

  matching.sort((a, b) => {
    const aDate = a.context?.instant || a.context?.endDate || "";
    const bDate = b.context?.instant || b.context?.endDate || "";
    return bDate.localeCompare(aDate);
  });

  const withNumeric = matching.filter((f) => f.numericValue !== undefined);
  return withNumeric.length > 0 ? withNumeric[0] : matching[0];
}

/**
 * Get two facts for comparison (e.g., current vs prior period).
 * Useful for calculating margins and growth metrics.
 */
function getFactPair(
  facts: XbrlFact[],
  concept: string,
  options?: { limit?: 2 | 4 },
): [current: XbrlFact | undefined, prior: XbrlFact | undefined] {
  const matching = findFactsByContext(facts, concept);
  matching.sort((a, b) => {
    const aDate = a.context?.instant || a.context?.endDate || "";
    const bDate = b.context?.instant || b.context?.endDate || "";
    return bDate.localeCompare(aDate);
  });

  return [matching[0], matching[1]];
}

/**
 * Parse financial metric from fact(s).
 * Returns numeric value or undefined.
 */
function getMetricValue(fact: XbrlFact | undefined): number | undefined {
  if (!fact) return undefined;
  return fact.numericValue ?? (fact.value ? parseFloat(fact.value) : undefined);
}

/**
 * Calculate ratio from two facts (e.g., gross margin = gross profit / revenue).
 */
function calculateRatio(
  numerator: XbrlFact | undefined,
  denominator: XbrlFact | undefined,
): number | undefined {
  const num = getMetricValue(numerator);
  const denom = getMetricValue(denominator);
  if (num === undefined || denom === undefined || denom === 0) return undefined;
  return num / denom;
}

/**
 * Calculate growth rate from two facts (e.g., YoY revenue growth).
 */
function calculateGrowth(
  current: XbrlFact | undefined,
  prior: XbrlFact | undefined,
): number | undefined {
  const curr = getMetricValue(current);
  const prev = getMetricValue(prior);
  if (curr === undefined || prev === undefined || prev === 0) return undefined;
  return (curr - prev) / prev;
}
