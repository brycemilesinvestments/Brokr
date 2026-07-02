import type { AgentAction, AgentState } from "@/lib/agent/contract";

export function routeNextAction(state: AgentState): AgentAction {
  if (state.completed) return "complete";
  if (!state.actionsTaken.includes("fetch_edgar")) return "fetch_edgar";
  if (!state.actionsTaken.includes("analyze")) return "analyze";
  if (!state.actionsTaken.includes("fetch_market")) return "fetch_market";
  if (!state.actionsTaken.includes("explain")) return "explain";
  return "complete";
}

export const ACTION_ORDER: AgentAction[] = [
  "fetch_edgar",
  "analyze",
  "fetch_market",
  "explain",
  "complete",
];

function isValidTransition(from: AgentAction, to: AgentAction): boolean {
  const fromIdx = ACTION_ORDER.indexOf(from);
  const toIdx = ACTION_ORDER.indexOf(to);
  return toIdx >= fromIdx;
}
