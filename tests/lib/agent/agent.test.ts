import { describe, expect, it } from "vitest";
import {
  routeNextAction,
  ACTION_ORDER,
  runAgentLoop,
  createInitialState,
  guardFalseComplete,
  type ExecuteAction,
  type AgentState,
} from "@/lib/agent";

describe("Agent chunk", () => {
  it("router ordering follows ACTION_ORDER", () => {
    let state = createInitialState("0002023554", "SNDK");
    const sequence: string[] = [];

    for (let i = 0; i < 5; i++) {
      const action = routeNextAction(state);
      sequence.push(action);
      state = { ...state, actionsTaken: [...state.actionsTaken, action] };
      if (action === "complete") break;
    }

    expect(sequence).toEqual(["fetch_edgar", "analyze", "fetch_market", "explain", "complete"]);
    expect(ACTION_ORDER.indexOf("analyze")).toBeGreaterThan(ACTION_ORDER.indexOf("fetch_edgar"));
  });

  it("terminates with budget exceeded", async () => {
    const executeAction: ExecuteAction = async ({ state }) => ({
      state,
      costUsd: 1,
    });

    const result = await runAgentLoop(
      executeAction,
      createInitialState("0002023554"),
      { maxIterations: 10, maxCostUsd: 0.5 },
    );

    expect(result.reason).toBe("budget_exceeded");
    expect(result.terminated).toBe(true);
  });

  it("completes with 0 iterations when max is 0", async () => {
    const executeAction: ExecuteAction = async ({ state }) => ({ state, costUsd: 0 });
    const result = await runAgentLoop(
      executeAction,
      createInitialState("0002023554"),
      { maxIterations: 0, maxCostUsd: 1 },
    );

    expect(result.state.iteration).toBe(0);
    expect(result.reason).toBe("max_iterations");
  });

  it("false-complete guard rejects missing analysis", () => {
    const state: AgentState = {
      cik: "0002023554",
      iteration: 0,
      costUsd: 0,
      completed: true,
      errors: [],
      actionsTaken: [],
    };
    expect(guardFalseComplete(state)).toBe(false);
  });

  it("guard passes when analysis present", () => {
    const state: AgentState = {
      cik: "0002023554",
      iteration: 1,
      costUsd: 0,
      completed: true,
      errors: [],
      actionsTaken: ["fetch_edgar"],
      analysis: {
        financials: { cik: "0002023554", entityName: "Test" },
        ratios: {},
        deltas: [],
        anomalies: [],
      },
    };
    expect(guardFalseComplete(state)).toBe(true);
  });
});
