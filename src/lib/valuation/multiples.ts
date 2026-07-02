import { safeDivide } from "@/lib/analysis";
import type { NormalizedBar } from "@/lib/market";
import { selectLatestFiledAsOf } from "@/lib/valuation/as-of";
import { PE_NEGATIVE_EARNINGS_REASON } from "@/lib/valuation/constants";
import type { EnterpriseValue } from "@/lib/valuation/types";
import type {
  MultiplePoint,
  MultipleSeries,
  TtmFundamentals,
  ValuationMultipleKey,
  ValuationMultiples,
} from "@/lib/valuation/types";

function computePe(
  marketCap: number,
  ttm: TtmFundamentals,
): { value?: number; nullReason?: string } {
  if (ttm.netIncome === undefined) return {};
  if (ttm.netIncome < 0) {
    return { nullReason: PE_NEGATIVE_EARNINGS_REASON };
  }
  return { value: safeDivide(marketCap, ttm.netIncome) };
}

function computeMultiple(
  numerator: number | undefined,
  denominator: number | undefined,
): number | undefined {
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }
  return numerator / denominator;
}

function buildMultipleSeries(
  key: ValuationMultipleKey,
  prices: NormalizedBar[],
  evByDate: Map<string, number>,
  marketCapByDate: Map<string, number>,
  ttmFundamentals: TtmFundamentals[],
  compute: (
    marketCap: number,
    ev: number | undefined,
    ttm: TtmFundamentals,
  ) => { value?: number; nullReason?: string },
): MultipleSeries {
  if (prices.length === 0 || ttmFundamentals.length === 0) {
    return { key, status: "not_reported", points: [] };
  }

  const points: MultiplePoint[] = prices.map((bar) => {
    const ttm = selectLatestFiledAsOf(ttmFundamentals, bar.date);
    if (!ttm) {
      return {
        date: bar.date,
        ttmPeriodEnd: "",
        ttmFiledDate: "",
      };
    }

    const marketCap = marketCapByDate.get(bar.date) ?? bar.close * (ttm.sharesOutstanding ?? 0);
    const ev = evByDate.get(bar.date);
    const result = compute(marketCap, ev, ttm);

    return {
      date: bar.date,
      value: result.value,
      nullReason: result.nullReason,
      ttmPeriodEnd: ttm.asOfPeriodEnd,
      ttmFiledDate: ttm.filedDate,
    };
  });

  return { key, status: "reported", points };
}

/** C8.3 — Daily valuation multiples against as-of TTM fundamentals. */
export function computeMultiples(
  prices: NormalizedBar[],
  enterpriseValue: EnterpriseValue,
  ttmFundamentals: TtmFundamentals[],
): ValuationMultiples {
  const evByDate = new Map(enterpriseValue.points.map((p) => [p.date, p.enterpriseValue]));
  const marketCapByDate = new Map(enterpriseValue.points.map((p) => [p.date, p.marketCap]));

  const pe = buildMultipleSeries(
    "pe",
    prices,
    evByDate,
    marketCapByDate,
    ttmFundamentals,
    (marketCap, _ev, ttm) => computePe(marketCap, ttm),
  );

  const pFcf = buildMultipleSeries(
    "p_fcf",
    prices,
    evByDate,
    marketCapByDate,
    ttmFundamentals,
    (marketCap, _ev, ttm) => ({ value: computeMultiple(marketCap, ttm.fcf) }),
  );

  const evSales = buildMultipleSeries(
    "ev_sales",
    prices,
    evByDate,
    marketCapByDate,
    ttmFundamentals,
    (_marketCap, ev, ttm) => ({ value: computeMultiple(ev, ttm.revenue) }),
  );

  const evEbitda = buildMultipleSeries(
    "ev_ebitda",
    prices,
    evByDate,
    marketCapByDate,
    ttmFundamentals,
    (_marketCap, ev, ttm) => ({ value: computeMultiple(ev, ttm.ebitda) }),
  );

  return { pe, pFcf: pFcf, evSales, evEbitda };
}
