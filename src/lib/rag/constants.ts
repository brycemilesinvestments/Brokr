/** Matches voyage-finance-2 default output size. */
export const EMBEDDING_DIMENSIONS = 1024;

export const VOYAGE_EMBEDDING_MODEL = "voyage-finance-2";
export const MIN_CHUNK_CHARS = 1500;
export const MAX_CHUNK_CHARS = 3200;
export const CONTEXT_TOKEN_BUDGET = 6000;
export const VECTOR_TOP_K = 8;
export const REVENUE_CONCEPT = "RevenueFromContractWithCustomerExcludingAssessedTax";

export const METRIC_ALIASES: Record<string, string> = {
  revenue: REVENUE_CONCEPT,
  sales: REVENUE_CONCEPT,
  "net income": "NetIncomeLoss",
  "gross profit": "GrossProfit",
  "operating income": "OperatingIncomeLoss",
  "total assets": "Assets",
  "cash flow": "NetCashProvidedByUsedInOperatingActivities",
  eps: "EarningsPerShareBasic",
};

export const NUMERIC_KEYWORDS = [
  "how much",
  "what was",
  "what is",
  "total",
  "amount",
  "revenue",
  "income",
  "profit",
  "margin",
  "eps",
  "earnings",
  "cash",
  "assets",
  "debt",
  "growth rate",
  "yoy",
  "qoq",
  "$",
  "billion",
  "million",
  "percent",
  "%",
];

export const QUALITATIVE_KEYWORDS = [
  "why",
  "explain",
  "describe",
  "risk",
  "strategy",
  "outlook",
  "management",
  "competitive",
  "market share",
  "customers",
  "products",
  "segment",
  "md&a",
  "disclosed",
  "said",
];

export const NOT_DISCLOSED_PHRASE = "not disclosed in the filings I have";
