/**
 * Valuation chunk — enterprise value and multiples (Tier 2).
 * Depends on: Edgar, Market (Chunk 2), Analysis (Chunk 3), Metrics (Chunk 7).
 */
export type {
  ValuationMultipleKey,
  TtmFundamentals,
  EnterpriseValuePoint,
  EnterpriseValue,
  MultiplePoint,
  MultipleSeries,
  ValuationMultiples,
  AlignedPriceFundamentals,
  ValuationBundle,
  ValuationState,
} from "@/lib/valuation/types";

export {
  REVENUE_CONCEPT,
  NET_INCOME_CONCEPT,
  OPERATING_INCOME_CONCEPT,
  DEBT_CONCEPT,
  CASH_CONCEPT,
  SHARES_CONCEPT,
  DEPRECIATION_CONCEPT,
  PE_NEGATIVE_EARNINGS_REASON,
} from "@/lib/valuation/constants";

export { selectLatestFiledAsOf, balancePointAsOf } from "@/lib/valuation/as-of";
export type { FiledSnapshot } from "@/lib/valuation/as-of";

export {
  toSingleQuarterFlows,
  computeTtmFundamentals,
  computeEnterpriseValue,
} from "@/lib/valuation/enterprise";

export { computeMultiples } from "@/lib/valuation/multiples";

export {
  alignPricesToFundamentals,
  toValuationChartBundle,
  buildValuationBundle,
} from "@/lib/valuation/align";
