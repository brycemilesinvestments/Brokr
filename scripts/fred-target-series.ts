export type SeriesTarget = {
  id: string;
  category: string;
  description: string;
};

/** Major economic series ingested from FRED (45 total). */
export const TARGET_SERIES: SeriesTarget[] = [
  // Employment
  { id: "UNRATE", category: "Employment", description: "Unemployment rate" },
  { id: "PAYEMS", category: "Employment", description: "Nonfarm payrolls" },
  { id: "ICSA", category: "Employment", description: "Initial jobless claims (weekly)" },
  { id: "JTSJOL", category: "Employment", description: "Job openings" },
  {
    id: "LNS12300060",
    category: "Employment",
    description: "Prime age employment rate (25-54)",
  },
  // Inflation
  { id: "CPIAUCSL", category: "Inflation", description: "CPI all items" },
  { id: "CPILFESL", category: "Inflation", description: "Core CPI (less food and energy)" },
  { id: "PCEPI", category: "Inflation", description: "PCE price index (Fed's preferred measure)" },
  { id: "PCEPILFE", category: "Inflation", description: "Core PCE" },
  { id: "T10YIE", category: "Inflation", description: "10-year breakeven inflation expectations" },
  { id: "PPIFIS", category: "Inflation", description: "Producer Price Index final demand" },
  // Interest Rates
  { id: "FEDFUNDS", category: "Interest Rates", description: "Federal funds rate" },
  { id: "DGS10", category: "Interest Rates", description: "10-year treasury yield" },
  { id: "DGS2", category: "Interest Rates", description: "2-year treasury yield" },
  {
    id: "T10Y2Y",
    category: "Interest Rates",
    description: "Yield curve spread (10Y minus 2Y, recession signal)",
  },
  { id: "BAMLH0A0HYM2", category: "Interest Rates", description: "High yield credit spread" },
  { id: "MORTGAGE30US", category: "Interest Rates", description: "30-year mortgage rate" },
  // GDP & Growth
  { id: "GDP", category: "GDP & Growth", description: "Nominal GDP" },
  {
    id: "A191RL1Q225SBEA",
    category: "GDP & Growth",
    description: "Real GDP growth rate (quarter over quarter)",
  },
  { id: "GDPC1", category: "GDP & Growth", description: "Real GDP chained dollars" },
  { id: "GFDEGDQ188S", category: "GDP & Growth", description: "Federal debt as percent of GDP" },
  // Consumer
  {
    id: "RSXFS",
    category: "Consumer",
    description: "Retail sales excluding food services",
  },
  { id: "PCE", category: "Consumer", description: "Personal consumption expenditures" },
  { id: "PSAVERT", category: "Consumer", description: "Personal savings rate" },
  { id: "UMCSENT", category: "Consumer", description: "University of Michigan consumer sentiment" },
  { id: "DSPIC96", category: "Consumer", description: "Real disposable personal income" },
  // Business & Capex
  {
    id: "PNFI",
    category: "Business & Capex",
    description: "Private nonresidential fixed investment (economy-wide capex)",
  },
  { id: "INDPRO", category: "Business & Capex", description: "Industrial production index" },
  { id: "CAPUTLB00004SQ", category: "Business & Capex", description: "Capacity utilization" },
  { id: "ISRATIO", category: "Business & Capex", description: "Business inventory to sales ratio" },
  { id: "MNFCTRIRSA", category: "Business & Capex", description: "Manufacturing inventories" },
  // Housing
  { id: "HOUST", category: "Housing", description: "Housing starts" },
  { id: "PERMIT", category: "Housing", description: "Building permits" },
  { id: "EXHOSLUSM495S", category: "Housing", description: "Existing home sales" },
  { id: "CSUSHPINSA", category: "Housing", description: "Case-Shiller national home price index" },
  // Credit & Financial Conditions
  {
    id: "DRCCLACBS",
    category: "Credit & Financial Conditions",
    description: "Credit card delinquency rate",
  },
  {
    id: "DRSFRMACBS",
    category: "Credit & Financial Conditions",
    description: "Mortgage delinquency rate",
  },
  {
    id: "TOTCI",
    category: "Credit & Financial Conditions",
    description: "Total consumer credit outstanding",
  },
  {
    id: "NFCI",
    category: "Credit & Financial Conditions",
    description: "Chicago Fed National Financial Conditions Index",
  },
  // Trade & Dollar
  { id: "BOPGSTB", category: "Trade & Dollar", description: "Trade balance goods and services" },
  { id: "DTWEXBGS", category: "Trade & Dollar", description: "Nominal broad US dollar index" },
  // Leading Indicators
  {
    id: "USSLIND",
    category: "Leading Indicators",
    description: "Conference Board Leading Economic Index",
  },
  { id: "USREC", category: "Leading Indicators", description: "NBER recession indicator (1 = recession)" },
  { id: "VIXCLS", category: "Leading Indicators", description: "VIX volatility index" },
  { id: "M2SL", category: "Leading Indicators", description: "M2 money supply" },
];
