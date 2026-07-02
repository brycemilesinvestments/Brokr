import type { ChartBundle, ChartPoint } from "@/lib/analysis";
import type { TimeSeriesBundle } from "@/lib/analysis";
import type { CompanyFactsResponse } from "@/lib/edgar";
import type { NormalizedBar } from "@/lib/market";
import type { ExtendedMetricsBundle } from "@/lib/metrics";
import { selectLatestFiledAsOf } from "@/lib/valuation/as-of";
import { computeEnterpriseValue, computeTtmFundamentals } from "@/lib/valuation/enterprise";
import { computeMultiples } from "@/lib/valuation/multiples";
import type {
  AlignedPriceFundamentals,
  EnterpriseValue,
  MultipleSeries,
  TtmFundamentals,
  ValuationBundle,
  ValuationMultiples,
} from "@/lib/valuation/types";

function nullReasonsFromMultiples(
  peReason?: string,
  pFcfReason?: string,
  evSalesReason?: string,
  evEbitdaReason?: string,
): AlignedPriceFundamentals["nullReasons"] {
  const reasons: AlignedPriceFundamentals["nullReasons"] = {};
  if (peReason) reasons.pe = peReason;
  if (pFcfReason) reasons.p_fcf = pFcfReason;
  if (evSalesReason) reasons.ev_sales = evSalesReason;
  if (evEbitdaReason) reasons.ev_ebitda = evEbitdaReason;
  return reasons;
}

function pointByDate<T extends { date: string }>(series: T[]): Map<string, T> {
  return new Map(series.map((p) => [p.date, p]));
}

/** C8.4 — Join daily prices to the most recent public fundamentals as of each date. */
export function alignPricesToFundamentals(
  prices: NormalizedBar[],
  ttmFundamentals: TtmFundamentals[],
  enterpriseValue: EnterpriseValue,
  multiples: ValuationMultiples,
): AlignedPriceFundamentals[] {
  const evByDate = pointByDate(enterpriseValue.points);
  const peByDate = pointByDate(multiples.pe.points);
  const pFcfByDate = pointByDate(multiples.pFcf.points);
  const evSalesByDate = pointByDate(multiples.evSales.points);
  const evEbitdaByDate = pointByDate(multiples.evEbitda.points);

  return prices.map((bar) => {
    const ttm = selectLatestFiledAsOf(ttmFundamentals, bar.date);
    const ev = evByDate.get(bar.date);
    const pe = peByDate.get(bar.date);
    const pFcf = pFcfByDate.get(bar.date);
    const evSales = evSalesByDate.get(bar.date);
    const evEbitda = evEbitdaByDate.get(bar.date);

    if (!ttm || !ev) {
      return {
        date: bar.date,
        price: bar.close,
        ttm: ttm ?? {
          asOfPeriodEnd: "",
          filedDate: "",
        },
        enterpriseValue: ev ?? {
          date: bar.date,
          price: bar.close,
          marketCap: 0,
          totalDebt: 0,
          cash: 0,
          enterpriseValue: 0,
          sharesOutstanding: 0,
          balanceSheetPeriodEnd: "",
          balanceSheetFiledDate: "",
        },
        multiples: {},
        nullReasons: {},
      };
    }

    return {
      date: bar.date,
      price: bar.close,
      ttm,
      enterpriseValue: ev,
      multiples: {
        pe: pe?.value,
        pFcf: pFcf?.value,
        evSales: evSales?.value,
        evEbitda: evEbitda?.value,
      },
      nullReasons: nullReasonsFromMultiples(
        pe?.nullReason,
        pFcf?.nullReason,
        evSales?.nullReason,
        evEbitda?.nullReason,
      ),
    };
  });
}

function multipleToChartPoints(series: MultipleSeries): ChartPoint[] {
  if (series.status === "not_reported") return [];

  return series.points
    .filter((p) => p.value !== undefined)
    .map((p) => ({
      x: p.date,
      y: p.value!,
      frequency: "quarterly" as const,
    }))
    .sort((a, b) => a.x.localeCompare(b.x));
}

/** C8.5 — ChartBundle with gaps (undefined multiples omitted, not zero). */
export function toValuationChartBundle(multiples: ValuationMultiples): ChartBundle {
  return {
    pe: multipleToChartPoints(multiples.pe),
    p_fcf: multipleToChartPoints(multiples.pFcf),
    ev_sales: multipleToChartPoints(multiples.evSales),
    ev_ebitda: multipleToChartPoints(multiples.evEbitda),
  };
}

export function buildValuationBundle(input: {
  cik: string;
  symbol: string;
  prices: NormalizedBar[];
  timeSeries: TimeSeriesBundle;
  rawFacts: CompanyFactsResponse;
  metrics: ExtendedMetricsBundle;
}): ValuationBundle {
  const ttmFundamentals = computeTtmFundamentals(
    input.timeSeries.metrics,
    input.rawFacts,
    input.metrics.cashFlowQuality.freeCashFlow,
  );
  const enterpriseValue = computeEnterpriseValue(input.prices, input.timeSeries.metrics);
  const multiples = computeMultiples(input.prices, enterpriseValue, ttmFundamentals);
  const aligned = alignPricesToFundamentals(
    input.prices,
    ttmFundamentals,
    enterpriseValue,
    multiples,
  );
  const chart = toValuationChartBundle(multiples);

  return {
    cik: input.cik,
    symbol: input.symbol,
    ttmFundamentals,
    enterpriseValue,
    multiples,
    aligned,
    chart,
  };
}
