export {
  type AgentAction,
  type AgentState,
  type ExecuteAction,
  type ExecuteActionInput,
  type ExecuteActionResult,
  type AgentConfig,
  type AgentRunResult,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_COST_USD,
  parseAgentConfigFromEnv,
} from "@/lib/agent/contract";

export { routeNextAction, ACTION_ORDER, isValidTransition } from "@/lib/agent/router";
export { createInitialState, guardFalseComplete, runAgentLoop } from "@/lib/agent/loop";

export {
  type QuarterlyAnalysisInput,
  type QuarterlyAnalysisOutput,
  buildQuarterlyContract,
  isQuarterlyComplete,
} from "@/lib/agent/contracts/quarterly";

export {
  type TimeSeriesAgentState,
  createTimeSeriesAgentState,
  applyCompanyFacts,
  guardTimeSeriesComplete,
} from "@/lib/agent/contracts/time-series";
