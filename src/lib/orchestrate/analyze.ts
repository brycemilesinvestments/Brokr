import { fromEdgarFinancials, computeRatios, computeDeltas, detectAnomalies } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/analysis";
import type { ExplainResponse } from "@/lib/ai";
import type { EdgarClient } from "@/lib/edgar";
import { toFinancials } from "@/lib/edgar";
import type { CompanyFactsResponse } from "@/lib/edgar";
import type { MarketClient, MarketHistory } from "@/lib/market";

export type AnalyzeQuarterInput = {
  cik: string;
  ticker?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
};

export type AnalyzeQuarterResult = {
  cik: string;
  ticker?: string;
  analysis: AnalysisResult;
  marketHistory?: MarketHistory;
  explanation?: ExplainResponse;
};

export type OrchestrateDeps = {
  edgar: EdgarClient;
  market?: MarketClient;
  explain?: (metrics: Record<string, number | string | undefined>, entityName: string, cik: string) => Promise<ExplainResponse>;
};

export async function analyzeCompanyQuarter(
  input: AnalyzeQuarterInput,
  deps: OrchestrateDeps,
): Promise<AnalyzeQuarterResult> {
  const facts = await deps.edgar.getCompanyFacts(input.cik);
  const financials = fromEdgarFinancials(toFinancials(facts as CompanyFactsResponse));
  const ratios = computeRatios(financials);
  const deltas = computeDeltas(financials);
  const anomalies = detectAnomalies(financials, ratios);

  const analysis: AnalysisResult = {
    financials,
    ratios,
    deltas,
    anomalies,
  };

  let marketHistory: MarketHistory | undefined;
  if (deps.market && input.ticker) {
    const period2 = Math.floor(Date.now() / 1000);
    const period1 = period2 - 365 * 24 * 60 * 60;
    marketHistory = await deps.market.getHistory(input.ticker, period1, period2);
  }

  let explanation: ExplainResponse | undefined;
  if (deps.explain) {
    explanation = await deps.explain(
      {
        revenue: financials.revenue,
        grossMargin: ratios.grossMargin,
        netMargin: ratios.netMargin,
        sharesOutstanding: financials.sharesOutstanding,
      },
      financials.entityName,
      input.cik,
    );
  }

  return {
    cik: input.cik,
    ticker: input.ticker,
    analysis,
    marketHistory,
    explanation,
  };
}

export function isValidCik(cik: string): boolean {
  const digits = cik.replace(/\D/g, "");
  return digits.length > 0 && digits.length <= 10;
}

export function normalizeCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}
