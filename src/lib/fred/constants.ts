/** Earliest observation date stored for FRED series. */
export const FRED_OBSERVATION_START = "1984-01-01";

/** FRED macro categories shown on the document timeline. */
export const FRED_CATEGORIES = [
  "Employment",
  "Inflation",
  "Interest Rates",
  "GDP & Growth",
  "Consumer",
  "Business & Capex",
  "Housing",
  "Credit & Financial Conditions",
  "Trade & Dollar",
  "Leading Indicators",
] as const;

export type FredCategory = (typeof FRED_CATEGORIES)[number];
