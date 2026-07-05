import type { MetricPolarity } from "@/lib/metrics/polarity/types";

const EXACT_POLARITY: Record<string, MetricPolarity> = {
  RevenueFromContractWithCustomerExcludingAssessedTax: "higher_better",
  GrossProfit: "higher_better",
  OperatingIncomeLoss: "higher_better",
  NetIncomeLoss: "higher_better",
  EarningsPerShareBasic: "higher_better",
  EarningsPerShareDiluted: "higher_better",
  Assets: "higher_better",
  AssetsCurrent: "higher_better",
  StockholdersEquity: "higher_better",
  CashAndCashEquivalentsAtCarryingValue: "higher_better",
  NetCashProvidedByUsedInOperatingActivities: "higher_better",
  free_cash_flow: "higher_better",
  RevenueRemainingPerformanceObligation: "higher_better",
  gross_margin: "higher_better",
  operating_margin: "higher_better",
  net_margin: "higher_better",
  current_ratio: "higher_better",
  return_on_equity: "higher_better",
  fcf_margin: "higher_better",
  Liabilities: "lower_better",
  debt_to_equity: "lower_better",
  capex_intensity: "lower_better",
  dso: "lower_better",
  dio: "lower_better",
  dpo: "lower_better",
  cash_conversion_cycle: "lower_better",
  sbc_pct_revenue: "lower_better",
  share_count_trend: "lower_better",
  net_issuance: "lower_better",
  pe: "lower_better",
  p_fcf: "lower_better",
  ev_sales: "lower_better",
  ev_ebitda: "lower_better",
  NetCashProvidedByUsedInInvestingActivities: "neutral",
  NetCashProvidedByUsedInFinancingActivities: "neutral",
};

const LOWER_BETTER_PATTERNS = [
  /expense/i,
  /cost(?! of goods)/i,
  /liabilit/i,
  /debt/i,
  /payable/i,
  /loss/i,
  /dilut/i,
  /outstanding.*shares/i,
  /sharesissued/i,
];

const HIGHER_BETTER_PATTERNS = [
  /revenue/i,
  /income/i,
  /profit/i,
  /margin/i,
  /equity/i,
  /asset/i,
  /cash(?! conversion)/i,
  /earnings/i,
  /backlog/i,
  /obligation/i,
  /return/i,
];

function matchesAny(patterns: RegExp[], value: string): boolean {
  return patterns.some((re) => re.test(value));
}

/** Best-effort polarity when AI classification is unavailable. */
export function guessPolarityFromMetricKey(metricKey: string): MetricPolarity {
  if (EXACT_POLARITY[metricKey]) return EXACT_POLARITY[metricKey];

  if (metricKey.startsWith("end_market:") || metricKey.startsWith("geography:")) {
    return "higher_better";
  }

  const normalized = metricKey.replace(/_/g, " ");

  if (matchesAny(LOWER_BETTER_PATTERNS, normalized)) {
    if (/gross profit|operating income|net income/i.test(normalized)) {
      return "higher_better";
    }
    return "lower_better";
  }

  if (matchesAny(HIGHER_BETTER_PATTERNS, normalized)) {
    return "higher_better";
  }

  return "neutral";
}
