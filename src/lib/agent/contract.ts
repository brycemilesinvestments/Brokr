import type { AnalysisResult } from "@/lib/analysis/types";
import type { ExplainResponse } from "@/lib/ai/types";

export type AgentAction =
  | "fetch_edgar"
  | "fetch_market"
  | "analyze"
  | "explain"
  | "complete";

export type AgentState = {
  cik: string;
  ticker?: string;
  iteration: number;
  costUsd: number;
  completed: boolean;
  analysis?: AnalysisResult;
  explanation?: ExplainResponse;
  errors: string[];
  actionsTaken: AgentAction[];
};

export type ExecuteActionInput = {
  action: AgentAction;
  state: AgentState;
};

export type ExecuteActionResult = {
  state: AgentState;
  costUsd: number;
};

export type ExecuteAction = (input: ExecuteActionInput) => Promise<ExecuteActionResult>;

export type AgentConfig = {
  maxIterations: number;
  maxCostUsd: number;
};

export type AgentRunResult = {
  state: AgentState;
  terminated: boolean;
  reason: "complete" | "max_iterations" | "budget_exceeded" | "error";
};

export const DEFAULT_MAX_ITERATIONS = 10;
export const DEFAULT_MAX_COST_USD = 0.5;

export function parseAgentConfigFromEnv(env: Record<string, string | undefined> = process.env): AgentConfig {
  return {
    maxIterations: Number(env.MAX_AGENT_ITERATIONS ?? DEFAULT_MAX_ITERATIONS),
    maxCostUsd: Number(env.MAX_AGENT_COST_USD ?? DEFAULT_MAX_COST_USD),
  };
}
