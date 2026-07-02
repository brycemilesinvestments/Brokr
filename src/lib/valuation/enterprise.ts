import type { CompanyFactsResponse } from "@/lib/edgar";
import type { MetricSeries, MetricSeriesBundle, MetricSeriesPoint } from "@/lib/edgar/time-series";
import { QUARTER_FPS } from "@/lib/edgar/time-series";
import type { NormalizedBar } from "@/lib/market";
import { buildConceptSeriesFromFacts, daysInPeriod } from "@/lib/metrics";
import type { DerivedMetricPoint, DerivedMetricSeries } from "@/lib/metrics";
import { balancePointAsOf } from "@/lib/valuation/as-of";
import {
  CASH_CONCEPT,
  DEBT_CONCEPT,
  DEPRECIATION_CONCEPT,
  NET_INCOME_CONCEPT,
  OPERATING_INCOME_CONCEPT,
  REVENUE_CONCEPT,
  SHARES_CONCEPT,
} from "@/lib/valuation/constants";
import type { EnterpriseValue, EnterpriseValuePoint, TtmFundamentals } from "@/lib/valuation/types";

const QUARTERLY_DURATION_MAX = 120;

function fpOrder(fp?: string): number {
  if (fp === "FY") return 4;
  const idx = QUARTER_FPS.indexOf(fp as (typeof QUARTER_FPS)[number]);
  return idx >= 0 ? idx : -1;
}

function compareFiscalPeriod(
  a: { fy?: number; fp?: string },
  b: { fy?: number; fp?: string },
): number {
  const fyDiff = (a.fy ?? 0) - (b.fy ?? 0);
  if (fyDiff !== 0) return fyDiff;
  return fpOrder(a.fp) - fpOrder(b.fp);
}

function quarterlyPoints(series: MetricSeries | undefined): MetricSeriesPoint[] {
  if (!series || series.status === "not_reported") return [];
  return series.quarterly.toSorted((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

/** Convert quarterly flow points to single-quarter amounts (handles YTD filings). */
export function toSingleQuarterFlows(points: MetricSeriesPoint[]): Map<string, number> {
  const byPeriodEnd = new Map<string, number>();
  const byFy = new Map<number, MetricSeriesPoint[]>();

  for (const point of points) {
    const fy = point.fy ?? 0;
    const group = byFy.get(fy) ?? [];
    group.push(point);
    byFy.set(fy, group);
  }

  for (const fyPoints of byFy.values()) {
    const ordered = fyPoints.toSorted((a, b) => compareFiscalPeriod(a, b));
    let priorYtd = 0;

    for (const point of ordered) {
      const days = daysInPeriod(point, "quarterly");
      if (days <= QUARTERLY_DURATION_MAX) {
        byPeriodEnd.set(point.periodEnd, point.value);
        priorYtd = point.value;
        continue;
      }

      const single = point.value - priorYtd;
      byPeriodEnd.set(point.periodEnd, single);
      priorYtd = point.value;
    }
  }

  return byPeriodEnd;
}

function derivedToFlowPoints(
  derived: DerivedMetricPoint[],
  metadata: MetricSeriesPoint[],
): MetricSeriesPoint[] {
  const metaByEnd = new Map(metadata.map((p) => [p.periodEnd, p]));

  return derived.reduce<MetricSeriesPoint[]>((acc, p) => {
    if (p.frequency !== "quarterly" || p.value === undefined) return acc;
    const meta = metaByEnd.get(p.periodEnd);
    acc.push({
      periodEnd: p.periodEnd,
      value: p.value,
      filed: meta?.filed ?? "",
      form: meta?.form ?? "10-Q",
      accn: meta?.accn ?? "",
      unit: "USD",
      fy: p.fy ?? meta?.fy,
      fp: p.fp ?? meta?.fp,
      start: meta?.start,
    });
    return acc;
  }, []);
}

function sumLastNQuarters(
  singleQuarter: Map<string, number>,
  anchorPeriodEnd: string,
  n: number,
): number | undefined {
  const ends = [...singleQuarter.keys()]
    .filter((end) => end.localeCompare(anchorPeriodEnd) <= 0)
    .sort((a, b) => a.localeCompare(b));

  if (ends.length < n) return undefined;

  const selected = ends.slice(-n);
  let total = 0;
  for (const end of selected) {
    const value = singleQuarter.get(end);
    if (value === undefined) return undefined;
    total += value;
  }
  return total;
}

function filingAnchors(series: MetricSeries | undefined): MetricSeriesPoint[] {
  const points = quarterlyPoints(series);
  const seen = new Set<string>();
  const anchors: MetricSeriesPoint[] = [];

  for (const point of points) {
    const key = `${point.periodEnd}:${point.filed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anchors.push(point);
  }

  return anchors.sort((a, b) => {
    const filed = a.filed.localeCompare(b.filed);
    if (filed !== 0) return filed;
    return a.periodEnd.localeCompare(b.periodEnd);
  });
}

function balanceValueAtAnchor(
  metrics: MetricSeriesBundle,
  anchor: MetricSeriesPoint,
  concept: string,
): number | undefined {
  return balancePointAsOf(metrics.series[concept], anchor.filed)?.value;
}

/** C8.1 — TTM fundamentals anchored to each quarterly filing. */
export function computeTtmFundamentals(
  metrics: MetricSeriesBundle,
  rawFacts: CompanyFactsResponse,
  freeCashFlow: DerivedMetricSeries,
): TtmFundamentals[] {
  const revenueSeries = metrics.series[REVENUE_CONCEPT];
  const anchors = filingAnchors(revenueSeries);
  if (anchors.length === 0) return [];

  const revenueSingle = toSingleQuarterFlows(quarterlyPoints(revenueSeries));
  const netIncomeSingle = toSingleQuarterFlows(quarterlyPoints(metrics.series[NET_INCOME_CONCEPT]));
  const operatingSingle = toSingleQuarterFlows(
    quarterlyPoints(metrics.series[OPERATING_INCOME_CONCEPT]),
  );

  const daSeries = buildConceptSeriesFromFacts(rawFacts, DEPRECIATION_CONCEPT);
  const daSingle = toSingleQuarterFlows(quarterlyPoints(daSeries));

  const fcfSingle = toSingleQuarterFlows(
    derivedToFlowPoints(
      freeCashFlow.status === "reported" ? freeCashFlow.quarterly : [],
      quarterlyPoints(revenueSeries),
    ),
  );

  const results: TtmFundamentals[] = [];

  for (const anchor of anchors) {
    const revenue = sumLastNQuarters(revenueSingle, anchor.periodEnd, 4);
    const netIncome = sumLastNQuarters(netIncomeSingle, anchor.periodEnd, 4);
    const operatingIncome = sumLastNQuarters(operatingSingle, anchor.periodEnd, 4);
    const depreciationAndAmortization = sumLastNQuarters(daSingle, anchor.periodEnd, 4);
    const fcf = sumLastNQuarters(fcfSingle, anchor.periodEnd, 4);

    const ebitda =
      operatingIncome !== undefined && depreciationAndAmortization !== undefined
        ? operatingIncome + depreciationAndAmortization
        : operatingIncome !== undefined && depreciationAndAmortization === undefined
          ? operatingIncome
          : undefined;

    results.push({
      asOfPeriodEnd: anchor.periodEnd,
      filedDate: anchor.filed,
      revenue,
      netIncome,
      operatingIncome,
      depreciationAndAmortization,
      ebitda,
      fcf,
      totalDebt: balanceValueAtAnchor(metrics, anchor, DEBT_CONCEPT),
      cash: balanceValueAtAnchor(metrics, anchor, CASH_CONCEPT),
      sharesOutstanding: balanceValueAtAnchor(metrics, anchor, SHARES_CONCEPT),
    });
  }

  return results;
}

/** C8.2 — Daily EV using filing-date-disciplined balance sheet values. */
export function computeEnterpriseValue(
  prices: NormalizedBar[],
  metrics: MetricSeriesBundle,
): EnterpriseValue {
  if (prices.length === 0) {
    return { status: "not_reported", points: [] };
  }

  const debtSeries = metrics.series[DEBT_CONCEPT];
  const cashSeries = metrics.series[CASH_CONCEPT];
  const sharesSeries = metrics.series[SHARES_CONCEPT];

  if (
    !debtSeries ||
    debtSeries.status === "not_reported" ||
    !cashSeries ||
    cashSeries.status === "not_reported" ||
    !sharesSeries ||
    sharesSeries.status === "not_reported"
  ) {
    return { status: "not_reported", points: [] };
  }

  const points: EnterpriseValuePoint[] = [];

  for (const bar of prices) {
    const debtPoint = balancePointAsOf(debtSeries, bar.date);
    const cashPoint = balancePointAsOf(cashSeries, bar.date);
    const sharesPoint = balancePointAsOf(sharesSeries, bar.date);
    if (!debtPoint || !cashPoint || !sharesPoint) continue;

    const totalDebt = debtPoint.value;
    const cash = cashPoint.value;
    const sharesOutstanding = sharesPoint.value;
    const marketCap = bar.close * sharesOutstanding;
    const enterpriseValue = marketCap + totalDebt - cash;

    const balanceSheetPeriodEnd = [
      debtPoint.periodEnd,
      cashPoint.periodEnd,
      sharesPoint.periodEnd,
    ].sort((a, b) => b.localeCompare(a))[0];

    const balanceSheetFiledDate = [
      debtPoint.filed,
      cashPoint.filed,
      sharesPoint.filed,
    ].sort((a, b) => b.localeCompare(a))[0];

    points.push({
      date: bar.date,
      price: bar.close,
      marketCap,
      totalDebt,
      cash,
      enterpriseValue,
      sharesOutstanding,
      balanceSheetPeriodEnd,
      balanceSheetFiledDate,
    });
  }

  return { status: points.length > 0 ? "reported" : "not_reported", points };
}
