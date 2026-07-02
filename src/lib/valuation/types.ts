import type { ChartBundle } from "@/lib/analysis";

export type ValuationMultipleKey = "pe" | "p_fcf" | "ev_sales" | "ev_ebitda";

/** C8.1 — Trailing-twelve-month fundamentals anchored to a filing. */
export type TtmFundamentals = {
  asOfPeriodEnd: string;
  filedDate: string;
  revenue?: number;
  netIncome?: number;
  operatingIncome?: number;
  depreciationAndAmortization?: number;
  ebitda?: number;
  fcf?: number;
  totalDebt?: number;
  cash?: number;
  sharesOutstanding?: number;
};

/** C8.2 — Enterprise value for a single trading day. */
export type EnterpriseValuePoint = {
  date: string;
  price: number;
  marketCap: number;
  totalDebt: number;
  cash: number;
  enterpriseValue: number;
  sharesOutstanding: number;
  balanceSheetPeriodEnd: string;
  balanceSheetFiledDate: string;
};

export type EnterpriseValue = {
  status: "reported" | "not_reported";
  points: EnterpriseValuePoint[];
};

/** C8.3 — Single multiple observation; null P/E when earnings negative. */
export type MultiplePoint = {
  date: string;
  value?: number;
  nullReason?: string;
  ttmPeriodEnd: string;
  ttmFiledDate: string;
};

export type MultipleSeries = {
  key: ValuationMultipleKey;
  status: "reported" | "not_reported";
  points: MultiplePoint[];
};

export type ValuationMultiples = {
  pe: MultipleSeries;
  pFcf: MultipleSeries;
  evSales: MultipleSeries;
  evEbitda: MultipleSeries;
};

/** Price bar joined to the most recent public fundamentals as of that date (C8.4). */
export type AlignedPriceFundamentals = {
  date: string;
  price: number;
  ttm: TtmFundamentals;
  enterpriseValue: EnterpriseValuePoint;
  multiples: {
    pe?: number;
    pFcf?: number;
    evSales?: number;
    evEbitda?: number;
  };
  nullReasons: Partial<Record<ValuationMultipleKey, string>>;
};

/** Full Chunk 8 output bundle (C8.5 chart-ready). */
export type ValuationBundle = {
  cik: string;
  symbol: string;
  ttmFundamentals: TtmFundamentals[];
  enterpriseValue: EnterpriseValue;
  multiples: ValuationMultiples;
  aligned: AlignedPriceFundamentals[];
  chart: ChartBundle;
};

export type ValuationState = {
  cik: string;
  symbol: string;
  bundle: ValuationBundle | null;
};
