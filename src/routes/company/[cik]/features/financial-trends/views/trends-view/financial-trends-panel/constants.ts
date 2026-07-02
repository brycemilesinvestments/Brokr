const CHART_WIDTH = 800;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 24, bottom: 44, left: 72 };

export const DEFAULT_METRIC = "RevenueFromContractWithCustomerExcludingAssessedTax";

export const METRIC_GROUPS = [
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
