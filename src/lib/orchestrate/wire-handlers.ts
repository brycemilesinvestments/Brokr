import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeFinancials, fromEdgarFinancials, type AnalysisResult } from "@/lib/analysis";
import { explainFinancials, type AiClient, type ExplainResponse } from "@/lib/ai";
import {
  createInitialState,
  runAgentLoop,
  buildQuarterlyContract,
  parseAgentConfigFromEnv,
  type AgentConfig,
  type AgentRunResult,
  type ExecuteAction,
  type ExecuteActionResult,
  type QuarterlyAnalysisOutput,
} from "@/lib/agent";
import {
  createEdgarClient,
  toFinancials,
  type EdgarClient,
  type CompanyFactsResponse,
} from "@/lib/edgar";
import { createMarketClient, type MarketClient } from "@/lib/market";
import {
  analyzeCompanyQuarter,
  type AnalyzeQuarterInput,
  type AnalyzeQuarterResult,
} from "@/lib/orchestrate/analyze";
import {
  analyzeCompany,
} from "@/lib/orchestrate/analyze-company";
import type { AnalyzeCompanyInput } from "@/lib/orchestrate/types";
import type { CompanyAnalysisOutput } from "@/lib/orchestrate/types";
import { parseMasterConfigFromEnv } from "@/lib/orchestrate/types";
import type { EventStudyTransaction } from "@/lib/insider";
import type { XbrlFact } from "@/lib/edgar";

export type WireHandlersDeps = {
  edgar?: EdgarClient;
  market?: MarketClient;
  ai?: AiClient;
  agentConfig?: AgentConfig;
  masterConfig?: ReturnType<typeof parseMasterConfigFromEnv>;
  fetchInsiderTransactions?: (cik: string) => Promise<EventStudyTransaction[]>;
  fetchIxbrlFacts?: (cik: string) => Promise<XbrlFact[]>;
};

export function wireHandlers(deps: WireHandlersDeps = {}): {
  edgar: EdgarClient;
  market: MarketClient;
  executeAction: ExecuteAction;
  analyzeQuarter: (input: AnalyzeQuarterInput) => Promise<QuarterlyAnalysisOutput>;
  analyzeCompany: (input: AnalyzeCompanyInput) => Promise<CompanyAnalysisOutput>;
  runQuarterlyAgent: (input: AnalyzeQuarterInput) => Promise<AgentRunResult>;
} {
  const edgar = deps.edgar ?? createEdgarClient({ supabaseClient: createAdminClient() ?? undefined });
  const market = deps.market ?? createMarketClient();

  const executeAction: ExecuteAction = async ({ action, state }): Promise<ExecuteActionResult> => {
    let nextState = { ...state };
    let costUsd = 0;

    switch (action) {
      case "fetch_edgar": {
        const facts = await edgar.getCompanyFacts(state.cik);
        const financials = fromEdgarFinancials(toFinancials(facts as CompanyFactsResponse));
        const { ratios, anomalies } = analyzeFinancials(financials);
        nextState = {
          ...nextState,
          analysis: {
            financials,
            ratios,
            deltas: [],
            anomalies,
          },
        };
        break;
      }
      case "analyze": {
        if (!nextState.analysis) {
          nextState = { ...nextState, errors: [...nextState.errors, "Fatal: missing edgar data"] };
        }
        break;
      }
      case "fetch_market": {
        if (state.ticker) {
          const period2 = Math.floor(Date.now() / 1000);
          const period1 = period2 - 90 * 24 * 60 * 60;
          await market.getHistory(state.ticker, period1, period2);
        }
        break;
      }
      case "explain": {
        if (deps.ai && nextState.analysis) {
          const explanation = await explainFinancials(deps.ai, {
            entityName: nextState.analysis.financials.entityName,
            cik: state.cik,
            metrics: {
              revenue: nextState.analysis.financials.revenue,
              grossMargin: nextState.analysis.ratios.grossMargin,
            },
          });
          costUsd = 0.001;
          nextState = { ...nextState, explanation };
        }
        break;
      }
      case "complete": {
        nextState = { ...nextState, completed: true };
        break;
      }
    }

    return { state: nextState, costUsd };
  };

  const analyzeQuarter = async (input: AnalyzeQuarterInput): Promise<QuarterlyAnalysisOutput> => {
    const explainFn = deps.ai
      ? async (
          metrics: Record<string, number | string | undefined>,
          entityName: string,
          cik: string,
        ): Promise<ExplainResponse> =>
          explainFinancials(deps.ai!, { entityName, cik, metrics })
      : undefined;

    const result = await analyzeCompanyQuarter(input, {
      edgar,
      market,
      explain: explainFn,
    });

    return buildQuarterlyContract(
      {
        cik: input.cik,
        ticker: input.ticker,
        fiscalYear: input.fiscalYear ?? result.analysis.financials.fiscalYear ?? 0,
        fiscalPeriod: input.fiscalPeriod ?? result.analysis.financials.fiscalPeriod ?? "FY",
      },
      result.analysis,
      result.explanation,
    );
  };

  const runQuarterlyAgent = async (input: AnalyzeQuarterInput): Promise<AgentRunResult> => {
    const config = deps.agentConfig ?? parseAgentConfigFromEnv();
    const state = createInitialState(input.cik, input.ticker);
    return runAgentLoop(executeAction, state, config);
  };

  const analyzeCompanyFull = async (input: AnalyzeCompanyInput): Promise<CompanyAnalysisOutput> => {
    const ixbrlFacts = deps.fetchIxbrlFacts
      ? await deps.fetchIxbrlFacts(input.cik)
      : undefined;

    return analyzeCompany(input, {
      edgar,
      market,
      ai: deps.ai,
      ixbrlFacts,
      fetchInsiderTransactions: deps.fetchInsiderTransactions,
      config: deps.masterConfig ?? parseMasterConfigFromEnv(),
    });
  };

  return {
    edgar,
    market,
    executeAction,
    analyzeQuarter,
    analyzeCompany: analyzeCompanyFull,
    runQuarterlyAgent,
  };
}

export async function analyzeCompanyQuarterOffline(
  input: AnalyzeQuarterInput,
  fixtures: { companyFacts: CompanyFactsResponse; explanation?: ExplainResponse },
): Promise<AnalyzeQuarterResult> {
  const financials = fromEdgarFinancials(toFinancials(fixtures.companyFacts));
  const { ratios, anomalies } = analyzeFinancials(financials);

  return {
    cik: input.cik,
    ticker: input.ticker,
    analysis: {
      financials,
      ratios,
      deltas: [],
      anomalies,
    },
    explanation: fixtures.explanation,
  };
}
