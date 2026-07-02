import {
  type AgentConfig,
  type AgentRunResult,
  type AgentState,
  type ExecuteAction,
} from "@/lib/agent/contract";
import { routeNextAction } from "@/lib/agent/router";

export function createInitialState(cik: string, ticker?: string): AgentState {
  return {
    cik,
    ticker,
    iteration: 0,
    costUsd: 0,
    completed: false,
    errors: [],
    actionsTaken: [],
  };
}

export function guardFalseComplete(state: AgentState): boolean {
  if (!state.completed) return false;
  const required: Array<keyof AgentState> = ["analysis"];
  return required.every((key) => state[key] !== undefined);
}

export async function runAgentLoop(
  executeAction: ExecuteAction,
  initialState: AgentState,
  config: AgentConfig,
): Promise<AgentRunResult> {
  let state = initialState;

  if (config.maxIterations === 0) {
    return { state, terminated: true, reason: "max_iterations" };
  }

  while (state.iteration < config.maxIterations) {
    if (state.costUsd >= config.maxCostUsd) {
      return { state, terminated: true, reason: "budget_exceeded" };
    }

    const action = routeNextAction(state);
    if (action === "complete") {
      if (!guardFalseComplete({ ...state, completed: true })) {
        state = {
          ...state,
          completed: false,
          errors: [...state.errors, "False complete guard: missing analysis"],
        };
        continue;
      }
      state = { ...state, completed: true };
      return { state, terminated: true, reason: "complete" };
    }

    const result = await executeAction({ action, state });
    state = {
      ...result.state,
      iteration: state.iteration + 1,
      costUsd: state.costUsd + result.costUsd,
      actionsTaken: [...state.actionsTaken, action],
    };

    if (state.errors.length > 0 && state.errors.some((e) => e.startsWith("Fatal:"))) {
      return { state, terminated: true, reason: "error" };
    }
  }

  return { state, terminated: true, reason: "max_iterations" };
}
