export const FUNDAMENTALS_METRIC_GROUPS = [
  {
    label: "Income statement",
    metrics: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "GrossProfit",
      "OperatingIncomeLoss",
      "NetIncomeLoss",
      "EarningsPerShareBasic",
    ],
  },
  {
    label: "Balance sheet",
    metrics: ["Assets", "AssetsCurrent", "Liabilities", "StockholdersEquity", "CashAndCashEquivalentsAtCarryingValue"],
  },
  {
    label: "Cash flow",
    metrics: [
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInInvestingActivities",
      "NetCashProvidedByUsedInFinancingActivities",
    ],
  },
  {
    label: "Ratios",
    metrics: [
      "gross_margin",
      "operating_margin",
      "net_margin",
      "current_ratio",
      "debt_to_equity",
      "return_on_equity",
    ],
  },
] as const;

export const EXTENDED_METRIC_GROUPS = [
  {
    label: "Cash flow quality",
    metrics: ["free_cash_flow", "fcf_margin", "capex_intensity"],
  },
  {
    label: "Working capital",
    metrics: ["dso", "dio", "dpo", "cash_conversion_cycle"],
  },
  {
    label: "Dilution",
    metrics: ["sbc_pct_revenue", "share_count_trend", "net_issuance"],
  },
  {
    label: "Backlog",
    metrics: ["RevenueRemainingPerformanceObligation"],
  },
] as const;

export const VALUATION_METRIC_GROUPS = [
  {
    label: "Valuation multiples",
    metrics: ["pe", "p_fcf", "ev_sales", "ev_ebitda"],
  },
] as const;

export type AnalysisCategory = "fundamentals" | "extended" | "valuation";

export const ANALYSIS_CATEGORY_LABELS: Record<AnalysisCategory, string> = {
  fundamentals: "Fundamentals",
  extended: "Extended",
  valuation: "Valuation",
};

export type MetricGroup = {
  label: string;
  metrics: readonly string[];
};

export type CategorizedMetricGroups = {
  category: AnalysisCategory;
  groups: readonly MetricGroup[];
};

export const ANALYSIS_METRIC_SECTIONS: readonly CategorizedMetricGroups[] = [
  { category: "fundamentals", groups: FUNDAMENTALS_METRIC_GROUPS },
  { category: "extended", groups: EXTENDED_METRIC_GROUPS },
  { category: "valuation", groups: VALUATION_METRIC_GROUPS },
];
