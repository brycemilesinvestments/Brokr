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
