import type {
  CompanyFactsResponse,
  CompanyFactUnit,
  ConceptSeries,
  EdgarFinancials,
} from "@/lib/edgar/types";

const REVENUE_CONCEPTS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "SalesRevenueNet",
];

const GROSS_PROFIT_CONCEPTS = ["GrossProfit"];
const OPERATING_INCOME_CONCEPTS = ["OperatingIncomeLoss", "OperatingIncome"];
const NET_INCOME_CONCEPTS = ["NetIncomeLoss", "ProfitLoss"];
const ASSETS_CONCEPTS = ["Assets"];
const LIABILITIES_CONCEPTS = ["Liabilities"];
const EQUITY_CONCEPTS = ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"];
const SHARES_CONCEPTS = ["EntityCommonStockSharesOutstanding", "CommonStockSharesOutstanding"];

function getSeries(
  response: CompanyFactsResponse,
  taxonomy: string,
  concept: string,
): ConceptSeries | undefined {
  const fact = response.facts[taxonomy]?.[concept];
  if (!fact?.units) return undefined;

  const [unit, points] = Object.entries(fact.units)[0] ?? [];
  if (!unit || !points?.length) return undefined;

  return { taxonomy, concept, unit, points: [...points] };
}

function findSeries(response: CompanyFactsResponse, concepts: string[], taxonomy = "us-gaap"): ConceptSeries | undefined {
  for (const concept of concepts) {
    const series = getSeries(response, taxonomy, concept);
    if (series) return series;
  }
  for (const concept of concepts) {
    const series = getSeries(response, "dei", concept);
    if (series) return series;
  }
  return undefined;
}

function sortByEnd(points: CompanyFactUnit[]): CompanyFactUnit[] {
  return [...points].sort((a, b) => (b.end ?? b.filed).localeCompare(a.end ?? a.filed));
}

function latestAnnualPoint(series: ConceptSeries): CompanyFactUnit | undefined {
  const annual = series.points.filter((p) => p.fp === "FY" || p.form === "10-K");
  const sorted = sortByEnd(annual.length > 0 ? annual : series.points);
  return sorted[0];
}

function priorAnnualPoint(series: ConceptSeries, current?: CompanyFactUnit): CompanyFactUnit | undefined {
  const annual = series.points.filter((p) => p.fp === "FY" || p.form === "10-K");
  const sorted = sortByEnd(annual.length > 0 ? annual : series.points);
  if (!current) return sorted[1];
  return sorted.find((p) => p.end !== current.end && p.fy !== undefined && current.fy !== undefined && p.fy < current.fy)
    ?? sorted[1];
}

function latestShares(response: CompanyFactsResponse): number | undefined {
  const series = findSeries(response, SHARES_CONCEPTS, "dei") ?? findSeries(response, SHARES_CONCEPTS);
  if (!series) return undefined;
  return sortByEnd(series.points)[0]?.val;
}

/** Map SEC companyfacts JSON to EdgarFinancials snapshot for analysis layer. */
export function toFinancials(response: CompanyFactsResponse): EdgarFinancials {
  const revenueSeries = findSeries(response, REVENUE_CONCEPTS);
  const grossSeries = findSeries(response, GROSS_PROFIT_CONCEPTS);
  const operatingSeries = findSeries(response, OPERATING_INCOME_CONCEPTS);
  const netSeries = findSeries(response, NET_INCOME_CONCEPTS);
  const assetsSeries = findSeries(response, ASSETS_CONCEPTS);
  const liabilitiesSeries = findSeries(response, LIABILITIES_CONCEPTS);
  const equitySeries = findSeries(response, EQUITY_CONCEPTS);

  const revenuePoint = revenueSeries ? latestAnnualPoint(revenueSeries) : undefined;
  const priorRevenuePoint = revenueSeries ? priorAnnualPoint(revenueSeries, revenuePoint) : undefined;
  const grossPoint = grossSeries ? latestAnnualPoint(grossSeries) : undefined;
  const priorGrossPoint = grossSeries ? priorAnnualPoint(grossSeries, grossPoint) : undefined;

  return {
    cik: response.cik,
    entityName: response.entityName,
    revenue: revenuePoint?.val,
    grossProfit: grossPoint?.val,
    operatingIncome: operatingSeries ? latestAnnualPoint(operatingSeries)?.val : undefined,
    netIncome: netSeries ? latestAnnualPoint(netSeries)?.val : undefined,
    totalAssets: assetsSeries ? latestAnnualPoint(assetsSeries)?.val : undefined,
    totalLiabilities: liabilitiesSeries ? latestAnnualPoint(liabilitiesSeries)?.val : undefined,
    stockholdersEquity: equitySeries ? latestAnnualPoint(equitySeries)?.val : undefined,
    sharesOutstanding: latestShares(response),
    fiscalYear: revenuePoint?.fy ?? grossPoint?.fy,
    fiscalPeriod: revenuePoint?.fp ?? grossPoint?.fp,
    asOfDate: revenuePoint?.end ?? grossPoint?.end,
    priorRevenue: priorRevenuePoint?.val,
    priorGrossProfit: priorGrossPoint?.val,
  };
}

export function extractConceptSeries(
  response: CompanyFactsResponse,
  taxonomy: string,
  concept: string,
): ConceptSeries | undefined {
  return getSeries(response, taxonomy, concept);
}

export function getLatestSharesOutstanding(response: CompanyFactsResponse): number | undefined {
  return latestShares(response);
}
